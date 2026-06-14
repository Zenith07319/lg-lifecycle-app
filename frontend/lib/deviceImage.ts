// 가전 폼팩터(벽걸이/스탠드)별 캐릭터+에어컨 이미지 — 홈 카드·내 가전 카드 공유.
// 등록 순서(rank)로 세트 안에서 회전 배정해 가전마다 다른 컷이 나오게 한다.
import type { SavedDevice } from "@/lib/myDevice";

const WALL_IMGS = [        // 벽걸이(기본): 처음 등록분은 char-fixed
  "/devices/char-fixed.png",
  "/devices/char-1.png",
  "/devices/char-2.png",
  "/devices/char-3.png",
  "/devices/char-4.png",
  "/devices/char-5.png",
];
const STAND_IMGS = [       // 스탠드(타워형)
  "/devices/stand-1.png",
  "/devices/stand-2.png",
  "/devices/stand-3.png",
];

export function deviceImage(form: string | undefined, rank: number): string {
  const set = form === "스탠드" ? STAND_IMGS : WALL_IMGS;   // 벽걸이·미상 → 벽걸이 세트
  return set[((rank % set.length) + set.length) % set.length];
}

// 등록 순서(오래된 순) rank — 같은 기기가 홈/내 가전에서 같은 컷이 나오도록 일관 계산.
export function registrationRank(all: SavedDevice[], sessionId: string): number {
  const asc = [...all].sort((a, b) => a.savedAt - b.savedAt);
  return Math.max(0, asc.findIndex((d) => d.sessionId === sessionId));
}
