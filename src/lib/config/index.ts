import { loadEnvConfig } from './services/env'
import { loadGitConfig } from './services/git'
import { loadGitignore, loadIgnore } from './services/ignore'
import { loadProjectConfig } from './services/project'
import { loadXDGConfig } from './services/xdg'
import { loadCmdLineFlags } from './services/yargs'
import { Config } from './types'
import { DEFAULT_CONFIG } from './default'

/**
 * Load application config
 *
 * Merge config from multiple sources.
 *
 * \* Order of precedence:
 * \* 1. Command line flags
 * \* 2. Environment variables
 * \* 3. Project config
 * \* 4. Git config
 * \* 5. XDG config
 * \* 6. .gitignore
 * \* 7. .ignore
 * \* 8. Default config
 *
 * @returns {Config} application config
 **/
export function loadConfig(): Config {
  // Default config
  let config = DEFAULT_CONFIG

  config = loadGitignore(config)
  config = loadIgnore(config)
  config = loadXDGConfig(config)
  config = loadGitConfig(config)
  config = loadProjectConfig(config)
  config = loadEnvConfig(config)
  config = loadCmdLineFlags(config)
  return config
}

const config = loadConfig()

export default config
