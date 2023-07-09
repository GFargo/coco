import { SimpleGit } from 'simple-git'
import { getChanges } from './getChanges' // Assuming the path to the function

jest.mock('simple-git')

// Mock the functions that getChanges uses
jest.mock('./getStatus', () => ({
  getStatus: jest.fn().mockReturnValue('mockedStatus'),
}))
jest.mock('./getSummaryText', () => ({
  getSummaryText: jest.fn().mockReturnValue('mockedSummary'),
}))

describe('getChanges', () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const git: jest.Mocked<SimpleGit> = {
    status: jest.fn().mockResolvedValue({
      files: [
        { path: 'file1.txt', working_dir: 'M', index: 'M' },
        { path: 'file2.js', working_dir: 'M', index: ' ' },
        { path: 'file3.txt', working_dir: '?', index: '?' },
        { path: 'dir/file4.txt', working_dir: ' ', index: 'M' },
        { path: 'dir/file5.js', working_dir: ' ', index: 'M' },
      ],
      renamed: [{ from: 'oldFile.txt', to: 'file1.txt' }],
    }),
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return file changes correctly', async () => {
    const result = await getChanges(git)

    expect(result).toEqual({
      staged: [
        {
          filepath: 'file1.txt',
          oldFilepath: 'oldFile.txt',
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
        {
          filepath: 'dir/file4.txt',
          oldFilepath: undefined,
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
        {
          filepath: 'dir/file5.js',
          oldFilepath: undefined,
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
      ],
      unstaged: [
        {
          filepath: 'file1.txt',
          oldFilepath: 'oldFile.txt',
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
        {
          filepath: 'file2.js',
          oldFilepath: undefined,
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
      ],
      untracked: [
        {
          filepath: 'file3.txt',
          oldFilepath: undefined,
          status: 'added',
          summary: 'mockedSummary',
        },
      ],
    })
  })

  it('should filter ignored files and extensions', async () => {
    const result = await getChanges(git, {
      ignoredFiles: [
        '**/file4.txt', 
        'file3.txt'
      ],
      ignoredExtensions: ['.js'],
    })

    expect(result).toEqual({
      staged: [
        {
          filepath: 'file1.txt',
          oldFilepath: 'oldFile.txt',
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
      ],
      unstaged: [
        {
          filepath: 'file1.txt',
          oldFilepath: 'oldFile.txt',
          status: 'mockedStatus',
          summary: 'mockedSummary',
        },
      ],
      untracked: [],
    })
  })
})
