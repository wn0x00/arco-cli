import { clack } from './utils/clack';

export type TemplateKind =
  | 'core-react-component'
  | 'core-vue-component'
  | 'core-react-library'
  | 'core-vue-library'
  | 'pro-react'
  | 'pro-vue'
  | 'team-site'
  | 'monorepo'
  | 'custom';

export type ProFramework = 'next' | 'vite' | 'cra';

export type PromptedTemplate = {
  kind: TemplateKind;
  template: string;
  packageName?: string;
  title?: string;
  description?: string;
  proFramework?: ProFramework;
  proSimple?: boolean;
};

const requireNonEmpty =
  (label: string) =>
  (value: string | undefined): string | undefined =>
    value && value.trim() ? undefined : `${label} is required`;

async function checkCancel<T>(value: T | symbol): Promise<T> {
  const { isCancel, cancel } = await clack();
  if (isCancel(value)) {
    cancel('Canceled');
    process.exit(0);
  }
  return value as T;
}

export async function confirmOverwrite(targetPath: string): Promise<boolean> {
  const { confirm } = await clack();
  return checkCancel(
    await confirm({
      message: `Directory already exists: ${targetPath}. Overwrite it?`,
      initialValue: false,
    })
  );
}

export async function promptPackageName(defaultName?: string): Promise<string> {
  const { text } = await clack();
  return checkCancel(
    await text({
      message: 'Package name',
      placeholder: defaultName,
      defaultValue: defaultName,
      validate: requireNonEmpty('Package name'),
    })
  );
}

export async function promptTemplate(): Promise<PromptedTemplate> {
  const { select, text } = await clack();

  const kind = await checkCancel(
    await select<TemplateKind>({
      message: 'Choose a template',
      options: [
        { value: 'core-react-component', label: 'React component' },
        { value: 'core-vue-component', label: 'Vue component' },
        { value: 'core-react-library', label: 'React component library' },
        { value: 'core-vue-library', label: 'Vue component library' },
        { value: 'pro-react', label: 'Arco Pro React' },
        { value: 'pro-vue', label: 'Arco Pro Vue' },
        { value: 'team-site', label: 'Team site' },
        { value: 'monorepo', label: 'Lerna monorepo' },
        { value: 'custom', label: 'Custom npm package or file: path' },
      ],
    })
  );

  if (kind.startsWith('core-')) {
    const packageName = await promptPackageName();
    const title = await checkCancel(
      await text({ message: 'Project title', validate: requireNonEmpty('Project title') })
    );
    const description = await checkCancel(await text({ message: 'Description', defaultValue: '' }));
    return { kind, template: '@arco-materials/template-core', packageName, title, description };
  }

  if (kind === 'pro-react' || kind === 'pro-vue') {
    const packageName = await promptPackageName();
    const proFramework = await checkCancel(
      await select<ProFramework>({
        message: 'Choose development framework',
        options:
          kind === 'pro-react'
            ? [
                { value: 'next', label: 'Next' },
                { value: 'vite', label: 'Vite' },
                { value: 'cra', label: 'Create React App' },
              ]
            : [{ value: 'vite', label: 'Vite' }],
      })
    );
    const proType = await checkCancel(
      await select<'simple' | 'full'>({
        message: 'Choose Arco Pro template',
        options: [
          { value: 'simple', label: 'Simple' },
          { value: 'full', label: 'Full' },
        ],
      })
    );
    return {
      kind,
      packageName,
      template: kind === 'pro-react' ? 'arco-design-pro' : 'arco-design-pro-vue',
      proFramework,
      proSimple: proType === 'simple',
    };
  }

  if (kind === 'custom') {
    const template = await checkCancel(
      await text({
        message: 'Template npm package or file: path',
        validate: requireNonEmpty('Template'),
      })
    );
    const packageName = await promptPackageName();
    return { kind, template, packageName };
  }

  const defaultsByKind: Record<Exclude<TemplateKind, 'custom'>, string> = {
    'core-react-component': '@arco-materials/template-core',
    'core-vue-component': '@arco-materials/template-core',
    'core-react-library': '@arco-materials/template-core',
    'core-vue-library': '@arco-materials/template-core',
    'pro-react': 'arco-design-pro',
    'pro-vue': 'arco-design-pro-vue',
    'team-site': '@arco-materials/template-team-site',
    monorepo: '@arco-materials/template-monorepo',
  };
  const packageName = await promptPackageName();
  return {
    kind,
    template: defaultsByKind[kind],
    packageName,
  };
}
