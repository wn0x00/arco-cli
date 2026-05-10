import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { patchChildProcessForWindows } from './patchChildProcess';

patchChildProcessForWindows();

type TemplateKind =
  | 'core-react-component'
  | 'core-vue-component'
  | 'core-react-library'
  | 'core-vue-library'
  | 'pro-react'
  | 'pro-vue'
  | 'team-site'
  | 'monorepo'
  | 'custom';

type InitProjectOptions = {
  projectName: string;
  template?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
};

type CreateProjectOptions = {
  root: string;
  projectName: string;
  template: string;
  packageJson?: Record<string, any>;
  isForMonorepo?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
  customInitFunctionParams?: Record<string, any>;
};

const TEMPLATE_DIR = 'template';
const TEMPLATE_DIR_FOR_MONOREPO = 'template-for-monorepo';
const CUSTOM_INIT_DIR = '.arco-cli';
const ARCO_REACT_PACKAGE = '@arco-design/web-react';
const ARCO_VUE_PACKAGE = '@arco-design/web-vue';

function printSuccess(message: string) {
  console.log(chalk.green(message));
}

function printWarn(message: string) {
  console.log(chalk.yellow(message));
}

async function execQuick(
  command: string,
  options: { cwd?: string; silent?: boolean } = {}
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const result = { code: 0, stdout: '', stderr: '' };
    const child = spawn(command, [], {
      cwd: options.cwd,
      shell: true,
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      result.stdout += output;
      if (options.silent === false) process.stdout.write(output);
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      result.stderr += output;
      if (options.silent === false) process.stderr.write(output);
    });

    child.on('close', (code) => {
      result.code = code || 0;
      resolve(result);
    });
  });
}

function getPackageInfo(installPackage: string): { name: string; version?: string } {
  if (installPackage.startsWith('file:')) {
    const installPackagePath = installPackage.replace(/^file:/, '');
    const { name, version } = require(path.join(installPackagePath, 'package.json'));
    return { name, version };
  }

  const versionSeparatorIndex = installPackage.startsWith('@')
    ? installPackage.indexOf('@', 1)
    : installPackage.lastIndexOf('@');

  if (versionSeparatorIndex > 0) {
    return {
      name: installPackage.slice(0, versionSeparatorIndex),
      version: installPackage.slice(versionSeparatorIndex + 1),
    };
  }

  return { name: installPackage };
}

async function promptTemplate(): Promise<{
  kind: TemplateKind;
  template: string;
  packageName?: string;
  title?: string;
  description?: string;
  proFramework?: 'next' | 'vite' | 'cra';
  proSimple?: boolean;
}> {
  const { kind } = await inquirer.prompt<{ kind: TemplateKind }>({
    type: 'list',
    name: 'kind',
    message: 'Choose a template',
    choices: [
      { name: 'React component', value: 'core-react-component' },
      { name: 'Vue component', value: 'core-vue-component' },
      { name: 'React component library', value: 'core-react-library' },
      { name: 'Vue component library', value: 'core-vue-library' },
      { name: 'Arco Pro React', value: 'pro-react' },
      { name: 'Arco Pro Vue', value: 'pro-vue' },
      { name: 'Team site', value: 'team-site' },
      { name: 'Lerna monorepo', value: 'monorepo' },
      { name: 'Custom npm package or file: path', value: 'custom' },
    ],
  });

  const coreTemplateKinds: TemplateKind[] = [
    'core-react-component',
    'core-vue-component',
    'core-react-library',
    'core-vue-library',
  ];

  if (coreTemplateKinds.includes(kind)) {
    const answers = await inquirer.prompt<{
      packageName: string;
      title: string;
      description: string;
    }>([
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name',
        validate: (value) => (value.trim() ? true : 'Package name is required'),
      },
      {
        type: 'input',
        name: 'title',
        message: 'Project title',
        validate: (value) => (value.trim() ? true : 'Project title is required'),
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description',
      },
    ]);

    return {
      ...answers,
      kind,
      template: '@arco-materials/template-core',
    };
  }

  if (kind === 'pro-react' || kind === 'pro-vue') {
    const answers = await inquirer.prompt<{
      packageName: string;
      proFramework: 'next' | 'vite' | 'cra';
      proType: 'simple' | 'full';
    }>([
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name',
        validate: (value) => (value.trim() ? true : 'Package name is required'),
      },
      {
        type: 'list',
        name: 'proFramework',
        message: 'Choose development framework',
        choices:
          kind === 'pro-react'
            ? [
                { name: 'Next', value: 'next' },
                { name: 'Vite', value: 'vite' },
                { name: 'Create React App', value: 'cra' },
              ]
            : [{ name: 'Vite', value: 'vite' }],
      },
      {
        type: 'list',
        name: 'proType',
        message: 'Choose Arco Pro template',
        choices: [
          { name: 'Simple', value: 'simple' },
          { name: 'Full', value: 'full' },
        ],
      },
    ]);

    return {
      kind,
      packageName: answers.packageName,
      template: kind === 'pro-react' ? 'arco-design-pro' : 'arco-design-pro-vue',
      proFramework: answers.proFramework,
      proSimple: answers.proType === 'simple',
    };
  }

  if (kind === 'custom') {
    const { template, packageName } = await inquirer.prompt<{
      template: string;
      packageName: string;
    }>([
      {
        type: 'input',
        name: 'template',
        message: 'Template npm package or file: path',
        validate: (value) => (value.trim() ? true : 'Template is required'),
      },
      {
        type: 'input',
        name: 'packageName',
        message: 'Package name',
        validate: (value) => (value.trim() ? true : 'Package name is required'),
      },
    ]);

    return {
      kind,
      template,
      packageName,
    };
  }

  const defaults: Record<TemplateKind, string> = {
    'core-react-component': '@arco-materials/template-core',
    'core-vue-component': '@arco-materials/template-core',
    'core-react-library': '@arco-materials/template-core',
    'core-vue-library': '@arco-materials/template-core',
    'pro-react': 'arco-design-pro',
    'pro-vue': 'arco-design-pro-vue',
    'team-site': '@arco-materials/template-team-site',
    monorepo: '@arco-materials/template-monorepo',
    custom: '',
  };

  const { packageName } = await inquirer.prompt<{ packageName: string }>({
    type: 'input',
    name: 'packageName',
    message: 'Package name',
    validate: (value) => (value.trim() ? true : 'Package name is required'),
  });

  return {
    kind,
    packageName,
    template: defaults[kind],
  };
}

function getMaterialType(kind: TemplateKind) {
  const framework = kind.includes('vue') ? 'vue' : 'react';

  if (kind.includes('library')) return `${framework}-library`;
  if (kind.includes('component')) return `${framework}-component`;
  return kind;
}

function createProjectOptionsFromPrompt(
  root: string,
  projectName: string,
  prompted: Awaited<ReturnType<typeof promptTemplate>>,
  options: InitProjectOptions
): CreateProjectOptions {
  if (prompted.kind?.startsWith('core-')) {
    const materialType = getMaterialType(prompted.kind);
    return {
      root,
      projectName,
      template: prompted.template,
      packageJson: {
        name: prompted.packageName,
        description: prompted.description,
        arcoMeta: {
          type: materialType,
          title: prompted.title,
        },
      },
      customInitFunctionParams: {
        type: materialType,
        packageName: prompted.packageName,
      },
      skipInstall: options.skipInstall,
      skipGit: options.skipGit,
    };
  }

  if (prompted.kind === 'pro-react' || prompted.kind === 'pro-vue') {
    return {
      root,
      projectName,
      template: prompted.template,
      packageJson: { name: prompted.packageName },
      customInitFunctionParams: {
        framework: prompted.proFramework,
        simple: prompted.proSimple,
      },
      skipInstall: options.skipInstall,
      skipGit: options.skipGit,
    };
  }

  return {
    root,
    projectName,
    template: prompted.template,
    packageJson: prompted.packageName ? { name: prompted.packageName } : {},
    isForMonorepo: prompted.kind === 'monorepo',
    skipInstall: options.skipInstall,
    skipGit: options.skipGit,
  };
}

function addGitIgnore(root: string) {
  const sourceFilename = path.join(root, 'gitignore');
  const targetFilename = path.join(root, '.gitignore');

  if (!fs.existsSync(sourceFilename)) return;

  if (fs.existsSync(targetFilename)) {
    fs.appendFileSync(targetFilename, fs.readFileSync(sourceFilename));
    fs.unlinkSync(sourceFilename);
    return;
  }

  fs.moveSync(sourceFilename, targetFilename);
}

function isTextFile(buffer: Buffer) {
  return !buffer.includes(0);
}

async function replaceConstants(root: string, packageJson: Record<string, any>) {
  const isVue = !!packageJson.peerDependencies?.vue;
  const arcoPackageName = isVue ? ARCO_VUE_PACKAGE : ARCO_REACT_PACKAGE;
  const replacements = {
    '@CONST_PACKAGE_NAME@': packageJson.name || '',
    '@CONST_ARCO_PACKAGE_NAME@': arcoPackageName,
    '@CONST_ARCO_DIST_CSS_NAME@': 'arco.css',
  };

  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git'].includes(entry.name)) {
            await walk(entryPath);
          }
          return;
        }

        const buffer = await fs.readFile(entryPath);
        if (!isTextFile(buffer)) return;

        let content = buffer.toString('utf8');
        Object.entries(replacements).forEach(([placeholder, value]) => {
          content = content.split(placeholder).join(value);
        });
        await fs.writeFile(entryPath, content);
      })
    );
  };

  await walk(root);
}

async function transformToProject(root: string, packageJsonToExtend: Record<string, any>) {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = fs.existsSync(packageJsonPath) ? fs.readJsonSync(packageJsonPath) : {};

  Object.assign(packageJson, packageJsonToExtend);
  if (packageJson._files) {
    packageJson.files = packageJson._files;
    delete packageJson._files;
  }

  fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  await replaceConstants(root, packageJson);
}

async function handleDependencies(
  root: string,
  dependencies?: string | string[],
  allowYarn = false
) {
  const dependencyList = Array.isArray(dependencies)
    ? dependencies
    : dependencies
      ? [dependencies]
      : [];
  let command = 'npm';
  let args = ['install'].concat(dependencyList);

  if (allowYarn) {
    const { stdout } = await execQuick('yarn -v', { cwd: root });
    if (/^\d+\.\d+/.test(stdout)) {
      command = 'yarn';
      args = dependencies ? ['add'].concat(dependencyList) : [];
    }
  }

  const commandExec = `${command} ${args.join(' ')}`;
  const { code, stderr } = await execQuick(commandExec, { cwd: root, silent: false });

  if (code !== 0) {
    throw new Error(`Command "${commandExec}" failed:\n${stderr}`);
  }
}

async function copyTemplateContent({
  root,
  template,
  isForMonorepo,
  customInitFunctionParams,
}: CreateProjectOptions) {
  const tempDir = path.resolve(os.homedir(), '.arco_template_cache', `${Date.now()}`);
  const spinner = ora();
  let shouldKeepTempDir = false;

  try {
    fs.ensureDirSync(tempDir);
    fs.writeJsonSync(path.join(tempDir, 'package.json'), {});

    spinner.start('Downloading template...');
    await handleDependencies(tempDir, template);
    spinner.succeed('Template downloaded');

    const templatePackagePath = path.join(tempDir, 'node_modules', getPackageInfo(template).name);
    const customInitPath = path.join(templatePackagePath, CUSTOM_INIT_DIR, 'init.js');
    const templatePath = path.join(templatePackagePath, TEMPLATE_DIR);
    const monorepoTemplatePath = path.join(templatePackagePath, TEMPLATE_DIR_FOR_MONOREPO);

    spinner.start('Copying template files...');
    if (isForMonorepo && fs.existsSync(monorepoTemplatePath)) {
      await fs.copy(monorepoTemplatePath, root, { overwrite: true });
    } else if (fs.existsSync(templatePath)) {
      await fs.copy(templatePath, root, { overwrite: true });
    } else if (fs.existsSync(customInitPath)) {
      const init = require(customInitPath);
      await init({
        ...customInitFunctionParams,
        projectPath: root,
      });
    } else {
      throw new Error(`No "${TEMPLATE_DIR}" directory or "${CUSTOM_INIT_DIR}/init.js" found`);
    }
    spinner.succeed('Template files copied');

    const hookPathCandidates = [
      path.join(templatePackagePath, 'hook', 'after-init.js'),
      path.join(templatePackagePath, CUSTOM_INIT_DIR, 'after-init.js'),
    ];

    shouldKeepTempDir = true;
    return {
      afterInitPath: hookPathCandidates.find((hookPath) => fs.existsSync(hookPath)),
      tempDir,
    };
  } finally {
    if (!shouldKeepTempDir) {
      try {
        fs.removeSync(tempDir);
      } catch {
        printWarn(`Failed to remove template cache: ${tempDir}`);
      }
    }
  }
}

async function tryGitCommit(root: string, packageName: string) {
  const { code: codeInit } = await execQuick('git init', { cwd: root });
  if (codeInit !== 0) return;

  const { code: codeAdd } = await execQuick('git add -A', { cwd: root });
  const { code: codeCommit } = await execQuick(
    `git commit -m "initialize ${packageName}" --no-verify`,
    {
      cwd: root,
    }
  );

  if (codeAdd !== 0 || codeCommit !== 0) {
    printWarn('Git commit not created');
  }
}

async function createProject(options: CreateProjectOptions) {
  const spinner = ora();
  const packageName = options.packageJson?.name || options.projectName;

  printSuccess(`\nCreating project at ${chalk.cyan(options.root)}`);
  fs.emptyDirSync(options.root);

  const { afterInitPath, tempDir } = await copyTemplateContent(options);

  spinner.start('Adapting template...');
  await transformToProject(options.root, {
    name: packageName,
    ...(options.packageJson || {}),
  });
  addGitIgnore(options.root);
  spinner.succeed('Template adapted');

  if (!options.skipInstall) {
    spinner.start('Installing dependencies...');
    try {
      await handleDependencies(options.root, undefined, true);
      spinner.succeed('Dependencies installed');
    } catch (err) {
      spinner.warn('Dependency installation failed');
      console.error(err);
    }
  }

  try {
    if (afterInitPath) {
      const afterInit = require(afterInitPath);
      await afterInit({
        root: options.root,
        projectName: options.projectName,
        isForMonorepo: !!options.isForMonorepo,
      });
    }
  } finally {
    try {
      fs.removeSync(tempDir);
    } catch {
      printWarn(`Failed to remove template cache: ${tempDir}`);
    }
  }

  if (!options.skipGit) {
    await tryGitCommit(options.root, packageName);
  }

  printSuccess('\nProject initialized successfully');
  console.log(`  cd ${options.projectName}`);
  if (options.skipInstall) {
    console.log('  npm install');
  }
  console.log('  npm run dev');
}

export default async function initProject(options: InitProjectOptions) {
  const root = path.resolve(options.projectName);

  if (fs.pathExistsSync(root)) {
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory already exists: ${root}. Overwrite it?`,
      default: false,
    });

    if (!overwrite) {
      printWarn('Canceled');
      return;
    }
  }

  if (options.template) {
    const { packageName } = await inquirer.prompt<{ packageName: string }>({
      type: 'input',
      name: 'packageName',
      message: 'Package name',
      default: options.projectName,
      validate: (value) => (value.trim() ? true : 'Package name is required'),
    });

    await createProject({
      root,
      projectName: options.projectName,
      template: options.template.startsWith('file:')
        ? `file:${path.resolve(options.template.replace(/^file:/, ''))}`
        : options.template,
      packageJson: { name: packageName },
      skipInstall: options.skipInstall,
      skipGit: options.skipGit,
    });
    return;
  }

  const prompted = await promptTemplate();
  await createProject(createProjectOptionsFromPrompt(root, options.projectName, prompted, options));
}
