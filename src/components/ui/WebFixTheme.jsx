import { Theme } from '@radix-ui/themes';

export default function WebFixTheme({ children, ...props }) {
  return <Theme appearance="light" accentColor="jade" grayColor="gray" radius="large" panelBackground="solid" scaling="100%" className="webfix-theme" {...props}>{children}</Theme>;
}
