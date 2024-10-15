import { createTwoFilesPatch } from 'diff'
import { promises as fs } from 'fs'
import { SimpleGit } from 'simple-git'
import { FileChange } from '../types'
import { Logger } from '../utils/logger'

/**
 * Parses the default file diff for a given nodeFile.
 *
 * @param nodeFile - The file change object.
 * @param commit - The commit to diff against. Defaults to '--staged'.
 * @param git - The SimpleGit instance.
 * @returns A Promise that resolves to the file diff as a string.
 */
async function parseDefaultFileDiff(
  nodeFile: FileChange,
  commit = '--staged',
  git: SimpleGit
): Promise<string> {
  if (commit === '--staged') {
    return await git.diff(['--staged', nodeFile.filePath])
  } else if (commit === '--unstaged') {
    return await git.diff([nodeFile.filePath])
  } else if (commit === '--untracked') {
    // For untracked files, read the file content directly from the filesystem
    try {
      const fileContent = await fs.readFile(nodeFile.filePath, 'utf-8')
      return fileContent
    } catch (error) {
      throw new Error(`Error reading untracked file: ${error?.message || 'Unknown error'}`)
    }
  }

  return await git.diff([commit, nodeFile.filePath])
}

/**
 * Parses the diff for a renamed file.
 *
 * @param nodeFile - The file change object.
 * @param commit - The commit hash or '--staged'.
 * @param git - The SimpleGit instance.
 * @param logger - The logger instance.
 * @returns A Promise that resolves to the diff string.
 */
async function parseRenamedFileDiff(
  nodeFile: FileChange,
  commit: string,
  git: SimpleGit,
  logger: Logger
): Promise<string> {
  let result = ''
  const oldFilePath = nodeFile?.oldFilePath || nodeFile.filePath

  let previousCommitHash = 'HEAD'
  let newCommitHash = ''

  if (commit !== '--staged') {
    try {
      previousCommitHash = await git.revparse([`${commit}~1`])
    } catch (err) {
      logger.verbose(`Error getting previous commit hash for ${nodeFile.filePath}`, {
        color: 'red',
      })
    }
    newCommitHash = commit
  }

  try {
    const [previousContent, newContent] = await Promise.all([
      git.show([`${previousCommitHash}:${oldFilePath}`]),
      git.show([`${newCommitHash}:${nodeFile.filePath}`]),
    ])

    if (previousContent !== newContent) {
      result = createTwoFilesPatch(
        oldFilePath,
        nodeFile.filePath,
        previousContent,
        newContent,
        '',
        '',
        {
          context: 3,
        }
      )
      // remove the first 4 lines of the patch (they contain the old and new file names)
      result = result.split('\n').slice(4).join('\n')
    } else {
      result = 'File contents are unchanged.'
    }
  } catch (err) {
    logger.verbose(`Error comparing file contents for ${nodeFile.filePath}`, { color: 'red' })
    result = 'Error comparing file contents.'
  }
  return result
}

/**
 * Retrieves the diff for a given file change in a specific commit.
 * If the file is deleted, it returns a message indicating that the file has been deleted.
 * If the file is renamed, it parses the renamed file diff and returns it.
 * Otherwise, it retrieves the default diff from the index and returns it.
 *
 * @param nodeFile - The file change object.
 * @param commit - The commit hash.
 * @param git - The SimpleGit instance.
 * @param logger - The logger instance.
 * @returns A promise that resolves to the diff as a string.
 */
export async function getDiff(
  nodeFile: FileChange,
  commit: '--staged' | '--unstaged' | '--untracked' | string,
  {
    git,
    logger,
  }: {
    git: SimpleGit
    logger: Logger
  }
): Promise<string> {
  if (nodeFile.status === 'deleted') {
    return 'This file has been deleted.'
  }

  if (nodeFile.status === 'renamed' && nodeFile.oldFilePath) {
    const renamedDiff = await parseRenamedFileDiff(nodeFile, commit, git, logger)
    return renamedDiff
  }

  // If not deleted or renamed, get the diff from the index
  const defaultDiff = await parseDefaultFileDiff(nodeFile, commit, git)
  return defaultDiff
}
