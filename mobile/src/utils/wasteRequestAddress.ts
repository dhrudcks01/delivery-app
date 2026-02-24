type WasteRequestAddressSource = {
  roadAddress: string;
  jibunAddress?: string;
  detailAddress?: string;
};

export const MAX_WASTE_REQUEST_ADDRESS_LENGTH = 255;

type WasteRequestAddressBuildResult =
  | { ok: true; address: string }
  | { ok: false; message: string };

function normalizeSpace(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function buildWasteRequestAddress(
  source: WasteRequestAddressSource,
): WasteRequestAddressBuildResult {
  const roadAddress = normalizeSpace(source.roadAddress);
  const jibunAddress = normalizeSpace(source.jibunAddress);
  const detailAddress = normalizeSpace(source.detailAddress);

  const baseAddress = roadAddress || jibunAddress;
  if (!baseAddress) {
    return {
      ok: false,
      message: '대표 주소지의 도로명/지번 주소가 비어 있습니다. 주소관리에서 주소를 다시 선택해 주세요.',
    };
  }

  const address = detailAddress ? `${baseAddress} ${detailAddress}` : baseAddress;
  if (address.length > MAX_WASTE_REQUEST_ADDRESS_LENGTH) {
    return {
      ok: false,
      message: `대표 주소지 길이가 ${MAX_WASTE_REQUEST_ADDRESS_LENGTH}자를 초과했습니다. 상세 주소를 줄여 주세요.`,
    };
  }

  return { ok: true, address };
}
