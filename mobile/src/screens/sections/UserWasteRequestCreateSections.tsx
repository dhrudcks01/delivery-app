import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollScreen } from '../../components/KeyboardAwareScrollScreen';
import { PhotoThumbnailCard } from '../../components/PhotoThumbnailCard';
import { TabHeaderCard } from '../../components/TabHeaderCard';
import { ui } from '../../theme/ui';

type Step = 0 | 1 | 2;
type Code = 'GENERAL' | 'BOX';
type ScreenStyles = Record<string, any>;

type WasteRequestEntrySectionProps = {
  includeTopInset: boolean;
  styles: ScreenStyles;
  primaryColor: string;
  canStartRequest: boolean;
  isCheckingServiceArea: boolean;
  serviceAreaError: string | null;
  isServiceAreaBlocked: boolean;
  serviceAreaUnavailableMessage: string;
  onOpenAddressManagement: () => void;
  onOpenServiceAreaBrowse: () => void;
  onRetryServiceArea: () => void;
  onStartRequest: () => void;
};

type WasteRequestStepFlowSectionProps = {
  includeTopInset: boolean;
  styles: ScreenStyles;
  step: Step;
  stepTitles: readonly string[];
  specialOptions: readonly string[];
  counts: Record<Code, number>;
  bagCount: number;
  options: string[];
  referencePhotoUrls: string[];
  isUploadingPhoto: boolean;
  photoUploadError: string | null;
  note: string;
  selectedDisposalItemSummaries: string[];
  selectedSpecialOptionSummaries: string[];
  addressSummaryText: string;
  serviceAreaError: string | null;
  agreed: boolean;
  error: string | null;
  isSubmitting: boolean;
  onAdjustCount: (code: Code, delta: number) => void;
  onAdjustBagCount: (delta: number) => void;
  onToggleOption: (option: string) => void;
  onAddPhoto: () => void;
  onRetryPhotoUpload: () => void;
  onRemovePhoto: (index: number) => void;
  onSelectPhoto: (url: string) => void;
  onChangeNote: (value: string) => void;
  onToggleAgreement: () => void;
  onBack: () => void;
  onNext: () => void;
};

export function WasteRequestEntrySection({
  includeTopInset,
  styles,
  primaryColor,
  canStartRequest,
  isCheckingServiceArea,
  serviceAreaError,
  isServiceAreaBlocked,
  serviceAreaUnavailableMessage,
  onOpenAddressManagement,
  onOpenServiceAreaBrowse,
  onRetryServiceArea,
  onStartRequest,
}: WasteRequestEntrySectionProps) {
  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} includeTopInset={includeTopInset}>
      <TabHeaderCard
        badge="수거 요청"
        title="수거 요청"
        description="대표 주소를 기준으로 수거 신청을 진행할 수 있어요."
        rightSlot={(
          <Pressable
            style={styles.addressMarkerButton}
            accessibilityRole="button"
            accessibilityLabel="대표주소 설정 화면으로 이동"
            hitSlop={8}
            onPress={onOpenAddressManagement}
          >
            <Ionicons name="location-outline" size={20} color={primaryColor} />
          </Pressable>
        )}
        meta={<Text style={styles.caption}>수거 품목 선택 → 특이사항 입력 → 신청 정보 확인 순서로 진행됩니다.</Text>}
      />

      {isCheckingServiceArea && (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={styles.caption}>서비스 가능 여부를 확인 중입니다.</Text>
        </View>
      )}

      {serviceAreaError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{serviceAreaError}</Text>
        </View>
      )}

      {serviceAreaError && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="서비스 가능 지역 다시 확인"
          accessibilityHint="서비스 가능 지역 조회를 다시 시도합니다."
          style={styles.secondaryButton}
          onPress={onRetryServiceArea}
        >
          <Text style={styles.secondaryButtonText}>다시 시도</Text>
        </Pressable>
      )}

      {isServiceAreaBlocked && !isCheckingServiceArea && !serviceAreaError && (
        <>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>{serviceAreaUnavailableMessage}</Text>
            <Text style={styles.warningText}>현재 대표 주소지는 신청 가능한 지역이 아닙니다.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="서비스 가능 지역 화면 열기"
            accessibilityHint="서비스 가능 지역 목록 화면으로 이동합니다."
            style={styles.secondaryButton}
            onPress={onOpenServiceAreaBrowse}
          >
            <Text style={styles.secondaryButtonText}>서비스 지역 살펴보기</Text>
          </Pressable>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="수거 요청 시작"
        accessibilityHint="수거 요청 단계 입력 화면으로 이동합니다."
        accessibilityState={{ disabled: !canStartRequest }}
        style={[styles.primaryButton, !canStartRequest && styles.buttonDisabled]}
        onPress={onStartRequest}
        disabled={!canStartRequest}
      >
        <Text style={styles.primaryButtonText}>수거 요청 시작</Text>
      </Pressable>
    </KeyboardAwareScrollScreen>
  );
}

export function WasteRequestStepFlowSection({
  includeTopInset,
  styles,
  step,
  stepTitles,
  specialOptions,
  counts,
  bagCount,
  options,
  referencePhotoUrls,
  isUploadingPhoto,
  photoUploadError,
  note,
  selectedDisposalItemSummaries,
  selectedSpecialOptionSummaries,
  addressSummaryText,
  serviceAreaError,
  agreed,
  error,
  isSubmitting,
  onAdjustCount,
  onAdjustBagCount,
  onToggleOption,
  onAddPhoto,
  onRetryPhotoUpload,
  onRemovePhoto,
  onSelectPhoto,
  onChangeNote,
  onToggleAgreement,
  onBack,
  onNext,
}: WasteRequestStepFlowSectionProps) {
  return (
    <KeyboardAwareScrollScreen contentContainerStyle={styles.container} includeTopInset={includeTopInset}>
      <View style={styles.stepCard}>
        <Text style={styles.badge}>신청 단계</Text>
        <Text style={styles.stepTitle}>{step + 1}. {stepTitles[step]}</Text>

        <View style={styles.progressRow}>
          {stepTitles.map((title, index) => (
            <View key={title} style={styles.progressItem}>
              <View style={[styles.progressDot, step >= index && styles.progressDotActive]} />
              <View style={[styles.progressBar, step >= index && styles.progressBarActive]} />
            </View>
          ))}
        </View>

        <View style={styles.progressLabelRow}>
          {stepTitles.map((title, index) => (
            <Text
              key={`${title}-label`}
              style={[styles.progressLabel, step === index && styles.progressLabelActive]}
              numberOfLines={1}
            >
              {index + 1}단계
            </Text>
          ))}
        </View>
      </View>

      {step === 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>수거 품목 선택</Text>

          <View style={styles.selectionCard}>
            <View style={styles.selectionTextWrap}>
              <Text style={styles.selectionTitle}>혼합 쓰레기</Text>
              <Text style={styles.selectionDescription}>기본 수거 품목입니다.</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="혼합 쓰레기 수량 감소"
                style={styles.counterButton}
                onPress={() => onAdjustCount('GENERAL', -1)}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </Pressable>
              <Text style={styles.counterValue}>{counts.GENERAL}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="혼합 쓰레기 수량 증가"
                style={styles.counterButton}
                onPress={() => onAdjustCount('GENERAL', 1)}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.selectionCard}>
            <View style={styles.selectionTextWrap}>
              <Text style={styles.selectionTitle}>택배 박스</Text>
              <Text style={styles.selectionDescription}>함께 배출할 박스 수량을 선택해 주세요.</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="택배 박스 수량 감소"
                style={styles.counterButton}
                onPress={() => onAdjustCount('BOX', -1)}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </Pressable>
              <Text style={styles.counterValue}>{counts.BOX}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="택배 박스 수량 증가"
                style={styles.counterButton}
                onPress={() => onAdjustCount('BOX', 1)}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionTitle}>비닐 배송 요청</Text>
          <View style={styles.selectionCard}>
            <View style={styles.selectionTextWrap}>
              <Text style={styles.selectionTitle}>전용 수거비닐</Text>
              <Text style={styles.selectionDescription}>필요한 수량을 선택해 주세요.</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="수거비닐 수량 감소"
                style={styles.counterButton}
                onPress={() => onAdjustBagCount(-1)}
              >
                <Text style={styles.counterButtonText}>-</Text>
              </Pressable>
              <Text style={styles.counterValue}>{bagCount}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="수거비닐 수량 증가"
                style={styles.counterButton}
                onPress={() => onAdjustBagCount(1)}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>특이사항</Text>
          {specialOptions.map((option) => {
            const selected = options.includes(option);
            return (
              <Pressable
                key={option}
                accessibilityRole="checkbox"
                accessibilityLabel={`${option} 선택`}
                accessibilityState={{ checked: selected }}
                hitSlop={8}
                style={[styles.optionChoice, selected && styles.optionChoiceSelected]}
                onPress={() => onToggleOption(option)}
              >
                <Text style={[styles.optionChoiceText, selected && styles.optionChoiceTextSelected]}>{option}</Text>
                <View style={[styles.optionBadge, selected && styles.optionBadgeSelected]}>
                  <Text style={[styles.optionBadgeText, selected && styles.optionBadgeTextSelected]}>
                    {selected ? '선택됨' : '미선택'}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>참고사진 ({referencePhotoUrls.length})</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="참고사진 추가"
              accessibilityHint="사진 라이브러리에서 참고사진을 선택합니다."
              accessibilityState={{ disabled: isUploadingPhoto }}
              style={[styles.secondaryButtonCompact, isUploadingPhoto && styles.buttonDisabled]}
              disabled={isUploadingPhoto}
              onPress={onAddPhoto}
            >
              <Text style={styles.secondaryButtonCompactText}>{isUploadingPhoto ? '업로드 중...' : '사진 추가'}</Text>
            </Pressable>
          </View>

          {photoUploadError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{photoUploadError}</Text>
            </View>
          )}

          {photoUploadError && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 업로드 다시 시도"
              accessibilityHint="참고사진 업로드를 다시 시도합니다."
              accessibilityState={{ disabled: isUploadingPhoto }}
              style={[styles.secondaryButton, isUploadingPhoto && styles.buttonDisabled]}
              disabled={isUploadingPhoto}
              onPress={onRetryPhotoUpload}
            >
              <Text style={styles.secondaryButtonText}>다시 시도</Text>
            </Pressable>
          )}

          {referencePhotoUrls.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>+</Text>
              <Text style={styles.emptyTitle}>참고사진이 없습니다.</Text>
              <Text style={styles.emptyDescription}>필요하면 사진을 추가해 기사에게 전달해 주세요.</Text>
            </View>
          )}

          <View style={styles.photoGrid}>
            {referencePhotoUrls.map((url, index) => (
              <PhotoThumbnailCard
                key={`${url}-${index}`}
                photoUrl={url}
                label={`참고사진 ${index + 1}`}
                onPress={() => onSelectPhoto(url)}
                onRemove={() => onRemovePhoto(index)}
                containerStyle={styles.referencePhotoCard}
                imageStyle={styles.referencePhotoImage}
              />
            ))}
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.label}>요청사항</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={onChangeNote}
              maxLength={300}
              multiline
              placeholder="요청사항을 입력해 주세요."
              placeholderTextColor={ui.colors.placeholder}
            />
            <Text style={styles.caption}>{note.length}/300</Text>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>방문일정</Text>
            <Text style={styles.summaryValueStrong}>해당 날 밤 10시 ~ 다음날 아침 6시 사이 방문</Text>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>주소</Text>
            <Text style={styles.summaryValue}>{addressSummaryText}</Text>
            {serviceAreaError && <Text style={styles.errorText}>{serviceAreaError}</Text>}
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>신청정보</Text>

            <Text style={styles.summaryLabel}>수거 품목</Text>
            {selectedDisposalItemSummaries.map((item) => (
              <Text key={item} style={styles.summaryBulletText}>• {item}</Text>
            ))}

            <Text style={styles.summaryLabel}>배출 특이사항</Text>
            {selectedSpecialOptionSummaries.map((item) => (
              <Text key={item} style={styles.summaryBulletText}>• {item}</Text>
            ))}
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>결제수단</Text>
            <Text style={styles.summaryValue}>카드 자동결제</Text>
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="유의사항 확인 동의"
            accessibilityHint="수거 신청 유의사항 확인 여부를 변경합니다."
            accessibilityState={{ checked: agreed }}
            style={styles.agreementRow}
            onPress={onToggleAgreement}
          >
            <View style={[styles.agreementCheckbox, agreed && styles.agreementCheckboxChecked]}>
              <Text style={[styles.agreementCheckboxText, agreed && styles.agreementCheckboxTextChecked]}>
                {agreed ? '✓' : ''}
              </Text>
            </View>
            <Text style={styles.agreementText}>유의사항을 확인했습니다.</Text>
          </Pressable>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? '수거 요청 취소' : '이전 단계로 이동'}
          style={styles.secondaryButton}
          onPress={onBack}
        >
          <Text style={styles.secondaryButtonText}>{step === 0 ? '취소' : '이전'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 2 ? '수거 요청 제출' : '다음 단계로 이동'}
          accessibilityState={{ disabled: isSubmitting || isUploadingPhoto }}
          style={[styles.primaryButton, (isSubmitting || isUploadingPhoto) && styles.buttonDisabled]}
          disabled={isSubmitting || isUploadingPhoto}
          onPress={onNext}
        >
          <Text style={styles.primaryButtonText}>
            {step === 2 ? (isSubmitting ? '요청 중...' : '수거 요청하기') : '다음'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollScreen>
  );
}


