/**
 * Photo file storage.
 *
 * Picked/captured photos start out as temporary cache files; we copy them
 * into <documentDirectory>/photos/<uuid>.jpg so they survive cache clears.
 * The database stores only the filename (relative path).
 */
import { Directory, File, Paths } from 'expo-file-system';

import { newId } from './id';

const PHOTOS_DIR_NAME = 'photos';

function photosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME);
}

function ensurePhotosDirectory(): Directory {
  const dir = photosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/** Copies a picked/captured image into permanent storage. Returns the stored filename. */
export function storePhoto(sourceUri: string): string {
  const dir = ensurePhotosDirectory();
  const extension = sourceUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${newId()}.${extension.length <= 4 ? extension : 'jpg'}`;
  const source = new File(sourceUri);
  source.copy(new File(dir, filename));
  return filename;
}

/** Absolute URI for a stored photo, for display. */
export function photoUri(filename: string): string {
  return new File(photosDirectory(), filename).uri;
}

/** Deletes a stored photo file. Missing files are ignored. */
export function deletePhotoFile(filename: string): void {
  try {
    const file = new File(photosDirectory(), filename);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Losing an orphaned file is not worth crashing over.
  }
}
