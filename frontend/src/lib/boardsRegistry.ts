import type { BoardSummary } from '../types/board'

const STORAGE_KEY = 'crystalline:boards'

/**
 * A local, per-browser index of boards this device has created or opened. Liveblocks' public
 * client key has no "list rooms" API (that requires a server-side secret key), so this registry
 * is what powers the "my boards" list on the home page. It is a pointer/cache only — the room
 * itself, not this list, is the source of truth for a board's content.
 */
function readAll(): BoardSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BoardSummary[]) : []
  } catch {
    return []
  }
}

function writeAll(boards: BoardSummary[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
  } catch {
    // Best-effort persistence only.
  }
}

export async function listBoards(): Promise<BoardSummary[]> {
  return [...readAll()].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Creates or touches a board's registry entry. `createdAt` only matters the first time a board
 * id is seen (a first-time create, or opening a board link on a device that's never seen it
 * before) — on every subsequent call the existing entry's `createdAt` is kept and `updatedAt` is
 * bumped to now, which is what drives the home page's "most recently updated" ordering. `mode` is
 * fixed for a board's lifetime (chosen once at creation, see `hooks/useBoardsRegistry.ts`'s
 * `useCreateBoard`) — an existing entry's `mode` always wins over whatever's passed here, so a
 * later call (e.g. `BoardView`'s title-sync effect, which doesn't itself track mode) can't
 * accidentally flip it.
 */
export async function registerBoard(
  summary: Pick<BoardSummary, 'id' | 'title' | 'createdAt' | 'mode'>,
): Promise<void> {
  const existing = readAll().find((board) => board.id === summary.id)
  const merged: BoardSummary = {
    id: summary.id,
    title: summary.title,
    createdAt: existing?.createdAt ?? summary.createdAt,
    updatedAt: Date.now(),
    mode: existing?.mode ?? summary.mode,
  }
  writeAll([merged, ...readAll().filter((board) => board.id !== summary.id)])
}

export async function renameBoardEntry(id: string, title: string): Promise<void> {
  writeAll(readAll().map((board) => (board.id === id ? { ...board, title } : board)))
}

export async function forgetBoardEntry(id: string): Promise<void> {
  writeAll(readAll().filter((board) => board.id !== id))
}
