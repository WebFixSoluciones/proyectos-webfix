import { Theme } from '@radix-ui/themes';

export default function WebFixTheme({ children, ...props }) {
  return <Theme appearance="light" accentColor="blue" grayColor="slate" radius="medium" panelBackground="solid" scaling="100%" className="webfix-theme" {...props}>{children}</Theme>;
}
