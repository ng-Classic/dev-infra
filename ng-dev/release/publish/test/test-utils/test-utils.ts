/**
 * @license
 * Copyright Google LLC
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as fs from 'fs';
import nock from 'nock';
import * as path from 'path';
import semver from 'semver';

import {dedent, GithubTestingRepo, testTmpDir} from '../../../../utils/testing/index.js';
import {
  _npmPackageInfoCache,
  ActiveReleaseTrains,
  NpmPackageInfo,
} from '../../../versioning/index.js';
import {ReleaseAction, ReleaseActionConstructor} from '../../actions.js';
import {getTestConfigurationsForAction, setupMocksForReleaseAction} from './action-mocks.js';
import {
  defaultTestOptions,
  TestOptions,
  TestOptionsWithDefaults,
  TestReleaseAction,
} from './test-action.js';

/**
 * Sets up the given release action for testing.
 * @param actionCtor Type of release action to be tested.
 * @param active Fake active release trains for the action,
 * @param isNextPublishedToNpm Whether the next version is published to NPM. True by default.
 * @param testOptions Additional options that can be used to control the test setup.
 */
export function setupReleaseActionForTesting<
  Type extends ReleaseAction,
  Options extends TestOptions,
  OptionsWithDefaults extends TestOptionsWithDefaults<Options>,
>(
  actionCtor: ReleaseActionConstructor<Type>,
  active: ActiveReleaseTrains,
  testOptions?: Options,
): TestReleaseAction<Type, OptionsWithDefaults> {
  // Reset existing HTTP interceptors.
  nock.cleanAll();

  const projectDir = testTmpDir;
  const testOptionsWithDefaults = {...defaultTestOptions, ...testOptions} as OptionsWithDefaults;
  const {githubConfig, releaseConfig} = getTestConfigurationsForAction();
  const repo = new GithubTestingRepo(githubConfig.owner, githubConfig.name);
  const fork = new GithubTestingRepo('some-user', 'fork');

  // The version for the next release-train or exceptional minor train do not necessarily
  // need to be published to NPM. We mock the NPM package request and fake the state of
  // the next version based on the test options. More details on e.g. the special case
  // for the next release train can be found in the next pre-release action.
  const fakeNpmVersions: Record<string, {} | undefined> = {};
  if (testOptionsWithDefaults.isNextPublishedToNpm) {
    fakeNpmVersions[active.next.version.format()] = {};
  }
  if (testOptionsWithDefaults.isExceptionalMinorPublishedToNpm && active.exceptionalMinor) {
    fakeNpmVersions[active.exceptionalMinor.version.format()] = {};
  }
  fakeNpmPackageQueryRequest(releaseConfig.representativeNpmPackage, {
    versions: fakeNpmVersions,
  });

  // Setup mocks for release action.
  const {gitClient, builtPackagesWithInfo, promptConfirmSpy} = setupMocksForReleaseAction<
    OptionsWithDefaults['useSandboxGitClient']
  >(
    githubConfig,
    releaseConfig,
    testOptionsWithDefaults.stubBuiltPackageOutputChecks,
    testOptionsWithDefaults.useSandboxGitClient,
  );

  const action = new actionCtor(active, gitClient, releaseConfig, projectDir);

  return {
    instance: action,
    active,
    repo,
    fork,
    projectDir,
    githubConfig,
    releaseConfig,
    gitClient,
    promptConfirmSpy,
    builtPackagesWithInfo,
  };
}

/** Parses the specified version into Semver. */
export function parse(version: string): semver.SemVer {
  return semver.parse(version)!;
}

/** Fakes a NPM package query API request for the given package. */
export function fakeNpmPackageQueryRequest(pkgName: string, data: Partial<NpmPackageInfo>) {
  _npmPackageInfoCache[pkgName] = Promise.resolve({
    'dist-tags': {},
    versions: {},
    time: {},
    ...data,
  });
}

/** Writes a `package.json` for the given package name. */
export async function writePackageJson(packageName: string, version: string) {
  const packageOutDir = path.join(testTmpDir, 'dist', packageName);
  const packageJsonPath = path.join(packageOutDir, 'package.json');

  await fs.promises.mkdir(packageOutDir, {recursive: true});
  await fs.promises.writeFile(packageJsonPath, JSON.stringify({version}));
}

/**
 * Template string function that converts a changelog pattern to a regular
 * expression that can be used for test assertions.
 *
 * The following transformations are applied to allow for more readable
 * test assertions:
 *
 *   1. The computed string will be updated to omit the smallest common indentation.
 *   2. The `<..>` is a placeholder that will allow for arbitrary content.
 */
export function changelogPattern(strings: TemplateStringsArray, ...values: any[]): RegExp {
  return new RegExp(
    sanitizeForRegularExpression(dedent(strings, ...values).trim()).replace(/<\\.\\.>/g, '.*?'),
    'g',
  );
}

/** Sanitizes a given string so that it can be used as literal in a RegExp. */
function sanitizeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
