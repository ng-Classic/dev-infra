/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ConfigValidationError, GithubConfig} from '../../utils/config';

/**
 * Possible merge methods supported by the Github API.
 * https://developer.github.com/v3/pulls/#merge-a-pull-request-merge-button.
 */
export type GithubApiMergeMethod = 'merge' | 'squash' | 'rebase';

/** Configuration for the Github API merge strategy. */
export interface GithubApiMergeStrategyConfig {
  /** Default method used for merging pull requests */
  default: GithubApiMergeMethod;
  /** Labels which specify a different merge method than the default. */
  labels?: {pattern: string; method: GithubApiMergeMethod}[];
}

/**
 * Configuration for the merge script with all remote options specified. The
 * default `MergeConfig` has does not require any of these options as defaults
 * are provided by the common dev-infra github configuration.
 */
export type MergeConfigWithRemote = MergeConfig & {remote: GithubConfig};

/** Configuration for the merge script. */
export interface MergeConfig {
  /**
   * Configuration for the upstream remote. All of these options are optional as
   * defaults are provided by the common dev-infra github configuration.
   */
  remote?: GithubConfig;
  /** List of target labels. */
  noTargetLabeling?: boolean;
  /** Required base commits for given branches. */
  requiredBaseCommits?: {[branchName: string]: string};
  /** Pattern that matches labels which imply a signed CLA. */
  claSignedLabel: string | RegExp;
  /** Pattern that matches labels which imply a merge ready pull request. */
  mergeReadyLabel: string | RegExp;
  /** Label that is applied when special attention from the caretaker is required. */
  caretakerNoteLabel?: string | RegExp;
  /** Label which can be applied to fixup commit messages in the merge script. */
  commitMessageFixupLabel: string | RegExp;
  /**
   * Whether pull requests should be merged using the Github API. This can be enabled
   * if projects want to have their pull requests show up as `Merged` in the Github UI.
   * The downside is that fixup or squash commits no longer work as the Github API does
   * not support this.
   */
  githubApiMerge: false | GithubApiMergeStrategyConfig;
  /**
   * List of commit scopes which are exempted from target label content requirements. i.e. no `feat`
   * scopes in patch branches, no breaking changes in minor or patch changes.
   */
  targetLabelExemptScopes?: string[];
}

/** Loads and validates the merge configuration. */
export function assertValidMergeConfig<T>(
  config: T & Partial<{merge: MergeConfig}>,
): asserts config is T & {merge: MergeConfig} {
  const errors: string[] = [];
  if (config.merge === undefined) {
    throw new ConfigValidationError('No merge configuration found. Set the `merge` configuration.');
  }

  if (!config.merge.claSignedLabel) {
    errors.push('No CLA signed label configured.');
  }
  if (!config.merge.mergeReadyLabel) {
    errors.push('No merge ready label configured.');
  }
  if (config.merge.githubApiMerge === undefined) {
    errors.push('No explicit choice of merge strategy. Please set `githubApiMerge`.');
  }

  if (errors.length) {
    throw new ConfigValidationError('Invalid `merge` configuration', errors);
  }
}

/** Label for pull requests containing a breaking change. */
export const breakingChangeLabel = 'flag: breaking change';