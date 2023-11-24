import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as ini from 'ini'
import { Config } from '../types'

/**
 * Load git profile config (from ~/.gitconfig)
 *
 * @param {Config} config
 * @returns {Config} Updated config
 **/
export function loadGitConfig(config: Config): Config {
  const gitConfigPath = path.join(os.homedir(), '.gitconfig')
  if (fs.existsSync(gitConfigPath)) {
    const gitConfigRaw = fs.readFileSync(gitConfigPath, 'utf-8')
    const gitConfigParsed = ini.parse(gitConfigRaw)

    config = {
      ...config,
      model: gitConfigParsed.coco?.model || config.model,
      openAIApiKey: gitConfigParsed.coco?.openAIApiKey || config.openAIApiKey,
      huggingFaceHubApiKey:
        gitConfigParsed.coco?.huggingFaceHubApiKey || config.huggingFaceHubApiKey,
      tokenLimit: parseInt(gitConfigParsed.coco?.tokenLimit) || config.tokenLimit,
      prompt: gitConfigParsed.coco?.prompt || config.prompt,
      mode: gitConfigParsed.coco?.mode || config.mode,
      temperature: gitConfigParsed.coco?.temperature || config.temperature,
      summarizePrompt: gitConfigParsed.coco?.summarizePrompt || config.summarizePrompt,
      ignoredFiles: gitConfigParsed.coco?.ignoredFiles || config.ignoredFiles,
      ignoredExtensions: gitConfigParsed.coco?.ignoredExtensions || config.ignoredExtensions,
      defaultBranch: gitConfigParsed.coco?.defaultBranch || config.defaultBranch,
    }
  }
  return config
}

/**
 * Appends the provided configuration to an INI file.
 * If the file does not exist, it creates a new one.
 *
 * @param filePath - The path to the INI file.
 * @param config - The configuration object to append.
 */
export const appendToIniFile = (filePath: string, config: Partial<Config>) => {
  const existingConfig = fs.existsSync(filePath)
    ? ini.parse(fs.readFileSync(filePath, 'utf-8'))
    : {}
  const combinedConfig = { ...existingConfig, ...config }
  const formattedConfig = ini.stringify(combinedConfig)
  fs.appendFileSync(filePath, `\n${formattedConfig}`)
}

/**
 * Converts the provided configuration to INI format.
 *
 * @param config - The configuration object to convert.
 * @returns The configuration in INI format.
 */
export const convertToIniFormat = (config: Partial<Config>): string => {
  return ini.stringify(config)
}
