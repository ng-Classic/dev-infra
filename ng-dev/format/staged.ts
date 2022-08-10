/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Argv, Arguments, CommandModule} from 'yargs';

import {GitClient} from '../utils/git/git-client.js';
import {checkFiles, formatFiles} from './format.js';

/** Command line options. */
export interface Options {
  check: boolean;
}

/** Yargs command builder for the command. */
function builder(argv: Argv): Argv<Options> {
  return argv.option('check', {
    type: 'boolean',
    default: process.env['CI'] ? true : false,
    description: 'Run the formatter to check formatting rather than updating code format',
  });
}

/** Yargs command handler for the command. */
async function handler({check}: Arguments<Options>) {
  const git = await GitClient.get();
  const executionCmd = check ? checkFiles : formatFiles;
  const allStagedFiles = git.allStagedFiles();
  process.exitCode = await executionCmd(allStagedFiles);
  if (!check && process.exitCode === 0) {
    git.runGraceful(['add', ...allStagedFiles]);
  }
}

/** CLI command module. */
export const StagedModule: CommandModule<{}, Options> = {
  builder,
  handler,
  command: 'staged',
  describe: 'Run the formatter on all staged files',
};
