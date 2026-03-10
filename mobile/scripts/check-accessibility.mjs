import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');
const baselinePath = path.join(projectRoot, 'scripts', 'accessibility-baseline.json');
const shouldUpdateBaseline = process.argv.includes('--update-baseline');

const targetPressables = new Set([
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function walkFiles(dir, accumulator) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, accumulator);
      continue;
    }
    if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      accumulator.push(fullPath);
    }
  }
}

function getJsxAttr(node, attrName) {
  return node.attributes.properties.find(
    (attr) => ts.isJsxAttribute(attr) && attr.name.text === attrName,
  );
}

function collectViolations() {
  const files = [];
  walkFiles(srcRoot, files);

  const violations = [];

  for (const absolutePath of files) {
    const sourceText = fs.readFileSync(absolutePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const relativeFile = toPosix(path.relative(projectRoot, absolutePath));

    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (ts.isIdentifier(node.tagName)) {
          const componentName = node.tagName.text;
          if (targetPressables.has(componentName)) {
            const hasOnPress = Boolean(getJsxAttr(node, 'onPress'));
            const hasAccessibilityLabel = Boolean(getJsxAttr(node, 'accessibilityLabel'));

            if (hasOnPress && !hasAccessibilityLabel) {
              const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              const signature = `${relativeFile}|${componentName}|missing-accessibilityLabel`;
              violations.push({
                signature,
                file: relativeFile,
                line,
                componentName,
                rule: 'missing-accessibilityLabel',
                message: 'onPress가 있는 터치 컴포넌트에는 accessibilityLabel이 필요합니다.',
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return violations;
}

function groupViolationCounts(violations) {
  const grouped = new Map();
  for (const violation of violations) {
    const current = grouped.get(violation.signature) ?? {
      signature: violation.signature,
      file: violation.file,
      componentName: violation.componentName,
      rule: violation.rule,
      count: 0,
      lines: [],
    };
    current.count += 1;
    current.lines.push(violation.line);
    grouped.set(violation.signature, current);
  }
  return grouped;
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  const raw = fs.readFileSync(baselinePath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.violations ?? {};
}

function writeBaseline(grouped) {
  const sortedSignatures = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const violations = {};
  for (const signature of sortedSignatures) {
    violations[signature] = grouped.get(signature).count;
  }
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    description:
      'onPress가 있는 Pressable/Touchable 계열 컴포넌트의 accessibilityLabel 누락 개수 기준선',
    violations,
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const violations = collectViolations();
const grouped = groupViolationCounts(violations);

if (shouldUpdateBaseline) {
  writeBaseline(grouped);
  console.log(
    `[a11y-guard] baseline updated (${grouped.size} signatures, ${violations.length} violations) -> ${toPosix(
      path.relative(projectRoot, baselinePath),
    )}`,
  );
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error(
    `[a11y-guard] baseline file is missing: ${toPosix(
      path.relative(projectRoot, baselinePath),
    )}`,
  );
  console.error('[a11y-guard] 최초 1회 기준선 생성: npm run lint:a11y -- --update-baseline');
  process.exit(1);
}

const regressions = [];
for (const [signature, current] of grouped.entries()) {
  const allowedCount = baseline[signature] ?? 0;
  if (current.count > allowedCount) {
    regressions.push({
      ...current,
      allowedCount,
      extraCount: current.count - allowedCount,
    });
  }
}

if (regressions.length > 0) {
  console.error('[a11y-guard] 접근성 회귀 감지: accessibilityLabel 누락이 기준선보다 증가했습니다.');
  for (const item of regressions.sort((a, b) => b.extraCount - a.extraCount)) {
    const previewLines = item.lines.slice(0, 6).join(', ');
    console.error(
      `- ${item.file} (${item.componentName}) baseline=${item.allowedCount}, current=${item.count}, +${item.extraCount} [lines: ${previewLines}${item.lines.length > 6 ? ', ...' : ''}]`,
    );
  }
  console.error('[a11y-guard] 가이드:');
  console.error('1) onPress가 있는 Pressable/Touchable 컴포넌트에 accessibilityLabel을 추가하세요.');
  console.error('2) 필요 시 accessibilityRole/accessibilityHint/accessibilityState를 함께 지정하세요.');
  console.error('3) 의도된 기준선 변경인 경우 리뷰 후 baseline을 갱신하세요.');
  console.error('   명령: npm run lint:a11y -- --update-baseline');
  process.exit(1);
}

const baselineSignatures = Object.keys(baseline).length;
const totalViolations = [...grouped.values()].reduce((sum, item) => sum + item.count, 0);
console.log(
  `[a11y-guard] pass: no regression (baseline signatures=${baselineSignatures}, current signatures=${grouped.size}, current violations=${totalViolations})`,
);
