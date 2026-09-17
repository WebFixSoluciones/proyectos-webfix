import { Tabs as RadixTabs } from '@radix-ui/themes';
import { forwardRef } from 'react';
export const Tabs = forwardRef(function Tabs(props, ref) { return <RadixTabs.Root ref={ref} {...props} />; });
export const TabsList = forwardRef(function TabsList(props, ref) { return <RadixTabs.List ref={ref} {...props} />; });
export const TabsTrigger = forwardRef(function TabsTrigger(props, ref) { return <RadixTabs.Trigger ref={ref} {...props} />; });
export const TabsContent = forwardRef(function TabsContent(props, ref) { return <RadixTabs.Content ref={ref} {...props} />; });
export default Tabs;
