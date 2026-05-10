import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { patchChildProcessForWindows } from '../init/patchChildProcess';
import { printBanner } from '../banner';
import { cleanStaleTemplateCache } from '../utils/cache';
import { clack } from '../utils/clack';
import {
  confirmOverwrite,
  promptPackageName,
  promptTemplate,
  PromptedTemplate,
} from '../init/prompts';
import { downloadAndCopyTemplate, installPackages, removeCacheEntry } from '../init/template';
import { adoptTemplateGitignore, transformToProject, tryInitialGitCommit } from '../init/project';
import { runTemplateHook } from '../init/templateHook';

patchChildProcessForWindows();

export type InitProjectOptions = {
  projectName: string;
  template?: string;
  skipInstall?: boolean;
  skipGit?: boolean;
};

type CreateProjectOptions = {
  root: string;
  projectName: string;
  template: string;
  packageJson?: Record<string, unknown>;
  isForMonorepo?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
  customInitFunctionParams?: Record<string, unknown>;
  /** Selected preset for the bundled `pro-recommend` template. */
  bundledPreset?: 'simple' | 'full';
};

function templateMaterialType(kind: PromptedTemplate['kind']): string {
  const framework = kind.includes('vue') ? 'vue' : 'react';
  if (kind.includes('library')) return `${framework}-library`;
  if (kind.includes('component')) return `${framework}-component`;
  return kind;
}

function buildOptionsFromPrompt(
  root: string,
  projectName: string,
  prompted: PromptedTemplate,
  flags: Pick<InitProjectOptions, 'skipInstall' | 'skipGit'>
): CreateProjectOptions {
  if (prompted.kind === 'pro-recommend') {
    return {
      root,
      projectName,
      template: 'pro-recommend',
      packageJson: { name: prompted.packageName },
      bundledPreset: prompted.recommendPreset ?? 'full',
      ...flags,
    };
  }

  if (prompted.kind.startsWith('core-')) {
    const materialType = templateMaterialType(prompted.kind);
    return {
      root,
      projectName,
      template: prompted.template,
      packageJson: {
        name: prompted.packageName,
        description: prompted.description,
        arcoMeta: { type: materialType, title: prompted.title },
      },
      customInitFunctionParams: {
        type: materialType,
        packageName: prompted.packageName,
      },
      ...flags,
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
      ...flags,
    };
  }

  return {
    root,
    projectName,
    template: prompted.template,
    packageJson: prompted.packageName ? { name: prompted.packageName } : {},
    isForMonorepo: prompted.kind === 'monorepo',
    ...flags,
  };
}

async function createProject(options: CreateProjectOptions): Promise<void> {
  const { spinner, log, note } = await clack();
  const packageName = (options.packageJson?.name as string) || options.projectName;

  log.step(`Creating project at ${chalk.cyan(options.root)}`);
  fs.emptyDirSync(options.root);

  const downloadSpinner = spinner();
  downloadSpinner.start('Downloading and copying template');
  let downloaded;
  try {
    downloaded = await downloadAndCopyTemplate({
      root: options.root,
      template: options.template,
      isForMonorepo: options.isForMonorepo,
      customInitFunctionParams: options.customInitFunctionParams,
      bundledPreset: options.bundledPreset,
    });
    downloadSpinner.stop('Template ready');
  } catch (err) {
    downloadSpinner.error('Template download failed');
    throw err;
  }

  const adaptSpinner = spinner();
  adaptSpinner.start('Adapting template');
  await transformToProject(options.root, {
    name: packageName,
    ...(options.packageJson || {}),
  });
  adoptTemplateGitignore(options.root);
  adaptSpinner.stop('Template adapted');

  if (!options.skipInstall) {
    const installSpinner = spinner();
    installSpinner.start('Installing dependencies');
    try {
      await installPackages(options.root, undefined, true);
      installSpinner.stop('Dependencies installed');
    } catch (err) {
      installSpinner.error('Dependency installation failed');
      log.warn((err as Error).message || String(err));
    }
  }

  try {
    if (downloaded.afterInitHookPath) {
      const afterInitSpinner = spinner();
      afterInitSpinner.start('Running after-init hook');
      try {
        await runTemplateHook(downloaded.afterInitHookPath, options.template, 'after-init', {
          root: options.root,
          projectName: options.projectName,
          isForMonorepo: !!options.isForMonorepo,
        });
        afterInitSpinner.stop('After-init hook complete');
      } catch (err) {
        afterInitSpinner.error('After-init hook failed');
        throw err;
      }
    }
  } finally {
    removeCacheEntry(downloaded.tempDir);
  }

  if (!options.skipGit) {
    const ok = await tryInitialGitCommit(options.root, packageName);
    if (!ok) log.warn('Git commit not created');
  }

  const nextSteps = [
    `cd ${options.projectName}`,
    options.skipInstall ? 'npm install' : null,
    'npm run dev',
  ]
    .filter(Boolean)
    .join('\n');
  note(nextSteps, 'Next steps');
}

export default async function initProject(options: InitProjectOptions): Promise<void> {
  cleanStaleTemplateCache();

  const { intro, outro } = await clack();
  const root = path.resolve(options.projectName);
  printBanner();
  intro(chalk.bold('arco init'));

  if (fs.pathExistsSync(root)) {
    const overwrite = await confirmOverwrite(root);
    if (!overwrite) {
      outro(chalk.yellow('Canceled'));
      return;
    }
  }

  if (options.template) {
    // Recognize the bundled recommend pseudo-name. Accept either
    // `--template pro-recommend` (defaults to full) or
    // `--template pro-recommend:simple` / `pro-recommend:full`.
    const recommendMatch = options.template.match(/^pro-recommend(?::(simple|full))?$/);
    if (recommendMatch) {
      const preset = (recommendMatch[1] as 'simple' | 'full' | undefined) ?? 'full';
      const packageName = await promptPackageName(options.projectName);
      await createProject({
        root,
        projectName: options.projectName,
        template: 'pro-recommend',
        packageJson: { name: packageName },
        bundledPreset: preset,
        skipInstall: options.skipInstall,
        skipGit: options.skipGit,
      });
      outro(chalk.green('Project initialized successfully'));
      return;
    }

    const packageName = await promptPackageName(options.projectName);
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
  } else {
    const prompted = await promptTemplate(options.projectName);
    await createProject(
      buildOptionsFromPrompt(root, options.projectName, prompted, {
        skipInstall: options.skipInstall,
        skipGit: options.skipGit,
      })
    );
  }

  outro(chalk.green('Project initialized successfully'));
}
