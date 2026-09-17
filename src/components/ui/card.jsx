import { forwardRef } from 'react';
import { Card as RadixCard, Heading, Text, Box, Flex } from '@radix-ui/themes';
export const Card = forwardRef(function Card(props, ref) { return <RadixCard ref={ref} {...props} />; });
export const CardHeader = forwardRef(function CardHeader(props, ref) { return <Flex ref={ref} direction="column" gap="2" mb="4" {...props} />; });
export const CardTitle = forwardRef(function CardTitle(props, ref) { return <Heading ref={ref} as="h3" size="4" {...props} />; });
export const CardDescription = forwardRef(function CardDescription(props, ref) { return <Text ref={ref} as="p" size="2" color="gray" {...props} />; });
export const CardContent = forwardRef(function CardContent(props, ref) { return <Box ref={ref} {...props} />; });
export const CardFooter = forwardRef(function CardFooter(props, ref) { return <Flex ref={ref} align="center" gap="3" mt="4" {...props} />; });
export default Card;
