import UnityVersionParser from './unity-version-parser';
import fs from 'fs';
import { getInput } from '@actions/core';

const Input = {
  get testModes() {
    return ['all', 'playmode', 'editmode'];
  },

  isValidFolderName(folderName) {
    const validFolderName = new RegExp(/^(\.|\.\/)?(\.?[\w~]+([ _-]?[\w~]+)*\/?)*$/);

    return validFolderName.test(folderName);
  },

  /**
   * When in package mode, we need to scrape the package's name from its package.json file
   */
  getPackageNameFromPackageJson(packagePath) {
    const packageJsonPath = `${packagePath}/package.json`;
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Invalid projectPath - Cannot find package.json at ${packageJsonPath}`);
    }

    let packageJson;

    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SyntaxError(`Unable to parse package.json contents as JSON - ${error.message}`);
      }

      throw new Error(`Unable to parse package.json contents as JSON - unknown error ocurred`);
    }

    const rawPackageName = packageJson.name;

    if (typeof rawPackageName !== 'string') {
      throw new TypeError(
        `Unable to parse package name from package.json - package name should be string, but was ${typeof rawPackageName}`,
      );
    }

    if (rawPackageName.length === 0) {
      throw new Error(`Package name from package.json is a string, but is empty`);
    }

    return rawPackageName;
  },

  /**
   * When in package mode, we need to ensure that the Tests folder is present
   */
  verifyTestsFolderIsPresent(packagePath) {
    if (!fs.existsSync(`${packagePath}/Tests`)) {
      throw new Error(
        `Invalid projectPath - Cannot find package tests folder at ${packagePath}/Tests`,
      );
    }
  },

  getFromUser() {
    // Input variables specified in workflow using "with" prop.
    const rawUnityVersion = getInput('unityVersion') || 'auto';
    const customImage = getInput('customImage') || '';
    const rawProjectPath = getInput('projectPath') || '.';
    const customParameters = getInput('customParameters') || '';
    const testMode = (getInput('testMode') || 'all').toLowerCase();
    const rawArtifactsPath = getInput('artifactsPath') || 'artifacts';
    const rawUseHostNetwork = getInput('useHostNetwork') || 'false';
    const sshAgent = getInput('sshAgent') || '';
    const gitPrivateToken = getInput('gitPrivateToken') || '';
    const githubToken = getInput('githubToken') || '';
    const checkName = getInput('checkName') || 'Test Results';
    const rawPackageMode = getInput('packageMode') || 'false';
    let packageName = '';

    // Validate input
    if (!this.testModes.includes(testMode)) {
      throw new Error(`Invalid testMode ${testMode}`);
    }

    if (!this.isValidFolderName(rawProjectPath)) {
      throw new Error(`Invalid projectPath "${rawProjectPath}"`);
    }

    if (!this.isValidFolderName(rawArtifactsPath)) {
      throw new Error(`Invalid artifactsPath "${rawArtifactsPath}"`);
    }

    if (rawUseHostNetwork !== 'true' && rawUseHostNetwork !== 'false') {
      throw new Error(`Invalid useHostNetwork "${rawUseHostNetwork}"`);
    }

    if (rawPackageMode !== 'true' && rawPackageMode !== 'false') {
      throw new Error(`Invalid packageMode "${rawPackageMode}"`);
    }

    // sanitize packageMode input and projectPath input since they are needed
    // for input validation
    const packageMode = rawPackageMode === 'true';
    const projectPath = rawProjectPath.replace(/\/$/, '');

    // if in package mode, attempt to get the package's name, and ensure tests are present
    if (packageMode) {
      packageName = this.getPackageNameFromPackageJson(projectPath);
      this.verifyTestsFolderIsPresent(projectPath);
    }

    // Sanitise other input
    const artifactsPath = rawArtifactsPath.replace(/\/$/, '');
    const useHostNetwork = rawUseHostNetwork === 'true';
    const unityVersion =
      rawUnityVersion === 'auto' ? UnityVersionParser.read(projectPath) : rawUnityVersion;

    // Return sanitised input
    return {
      unityVersion,
      customImage,
      projectPath,
      customParameters,
      testMode,
      artifactsPath,
      useHostNetwork,
      sshAgent,
      gitPrivateToken,
      githubToken,
      checkName,
      packageMode,
      packageName,
    };
  },
};

export default Input;
