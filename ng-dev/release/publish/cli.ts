/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import yargs from 'yargs';

import {assertValidGithubConfig, getConfig} from '../../utils/config';
import {addGithubTokenOption} from '../../utils/git/github-yargs';
import {assertValidReleaseConfig} from '../config/index';

import {CompletionState, ReleaseTool} from './index';
import {AuthenticatedGitClient} from '../../utils/git/authenticated-git-client';
import {green, Log, yellow} from '../../utils/logging';

/** Command line options for publishing a release. */
export interface ReleasePublishOptions {
  githubToken: string;
}

/** Yargs command builder for configuring the `ng-dev release publish` command. */
function builder(argv: yargs.Argv): yargs.Argv<ReleasePublishOptions> {
  return addGithubTokenOption(argv);
}

/** Yargs command handler for staging a release. */
async function handler() {
  const git = AuthenticatedGitClient.get();
  const config = getConfig();
  assertValidReleaseConfig(config);
  assertValidGithubConfig(config);
  const task = new ReleaseTool(git, config.release, config.github, git.baseDir);
  const result = await task.run();

  switch (result) {
    case CompletionState.FATAL_ERROR:
      Log.error(`Release action has been aborted due to fatal errors. See above.`);
      process.exitCode = 2;
      break;
    case CompletionState.MANUALLY_ABORTED:
      Log.info(yellow(`Release action has been manually aborted.`));
      process.exitCode = 1;
      break;
    case CompletionState.SUCCESS:
      Log.info(green(`Release action has completed successfully.`));
      break;
  }
}

/** CLI command module for publishing a release. */
export const ReleasePublishCommandModule: yargs.CommandModule<{}, ReleasePublishOptions> = {
  builder,
  handler,
  command: 'publish',
  describe: 'Publish new releases and configure version branches.',
};
