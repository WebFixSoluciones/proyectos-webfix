import { forwardRef } from 'react';
import { Box, Card, Heading, Text } from '@radix-ui/themes';
export const UiBox = forwardRef(function UiBox(props, ref) { return <Box ref={ref} {...props} />; });
export const UiCard = forwardRef(function UiCard(props, ref) { return <Card ref={ref} {...props} />; });
export const UiHeading = forwardRef(function UiHeading(props, ref) { return <Heading ref={ref} {...props} />; });
export const UiText = forwardRef(function UiText(props, ref) { return <Text ref={ref} {...props} />; });
export const UiLabel = forwardRef(function UiLabel({ children, size = '2', weight = 'medium', color, highContrast, ...props }, ref) {
  return <Text asChild size={size} weight={weight} color={color} highContrast={highContrast}><label ref={ref} {...props}>{children}</label></Text>;
});
