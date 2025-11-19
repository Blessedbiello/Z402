import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layout';
import type { BaseLayoutProps } from 'fumadocs-ui/layout';
import { docs, meta } from '@/source.config';

const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Z402',
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'API Reference',
      url: '/docs/api-reference',
    },
    {
      text: 'GitHub',
      url: 'https://github.com/z402',
      external: true,
    },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={docs.pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
