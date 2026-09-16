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
  return [...readAll()].sort((a, b) => b.createdAt - a.createdAt)
}

export async function registerBoard(summary: BoardSummary): Promise<void> {
  writeAll([summary, ...readAll().filter((board) => board.id !== summary.id)])
}

export async function renameBoardEntry(id: string, title: string): Promise<void> {
  writeAll(readAll().map((board) => (board.id === id ? { ...board, title } : board)))
}

export async function forgetBoardEntry(id: string): Promise<void> {
  writeAll(readAll().filter((board) => board.id !== id))
}
