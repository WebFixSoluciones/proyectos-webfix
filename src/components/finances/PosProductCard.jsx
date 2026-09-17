import { Badge, Card, Flex, Inset, Text } from '@radix-ui/themes';
import { Package, Plus } from 'lucide-react';

export default function PosProductCard({ product, imageUrl, quantity, outOfStock, lowStock, onAdd }) {
  const isService = product?.type === 'servicio';
  return (
    <Card asChild variant="surface">
      <button 
        type="button" 
        disabled={outOfStock && !isService} 
        onClick={onAdd} 
        aria-label={`Agregar ${product.name}`} 
        className="w-full h-full text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-all p-3 flex flex-col justify-between"
      >
        <Flex direction="column" gap="3" height="100%">
          <Flex justify="between" align="center" gap="2">
            <Badge color={outOfStock && !isService ? 'red' : lowStock ? 'amber' : isService ? 'blue' : 'green'} size="1">
              {product.sku || product.code || (isService ? 'Servicio' : 'Sin código')}
            </Badge>
            <Badge color={outOfStock && !isService ? 'gray' : quantity > 0 ? 'blue' : 'gray'} variant={quantity > 0 ? 'solid' : 'soft'}>
              {quantity > 0 ? `+${quantity}` : outOfStock && !isService ? 'Agotado' : <Plus size={14} />}
            </Badge>
          </Flex>
          <Inset clip="padding-box" side="x">
            <Flex height="110px" align="center" justify="center">
              {imageUrl === '/product.svg' ? (
                <Package size={48} color="var(--gray-9)" strokeWidth={1.5} />
              ) : (
                <img 
                  src={imageUrl} 
                  alt="" 
                  className="w-full h-full object-contain" 
                  onError={event => { event.currentTarget.src = '/product.svg'; }} 
                />
              )}
            </Flex>
          </Inset>
          <Flex direction="column" gap="1" mt="auto">
            <Text size="2" weight="medium" className="line-clamp-2 leading-snug">{product.name}</Text>
            <Flex justify="between" align="center" gap="2">
              <Text size="1" color="gray">
                {isService ? 'Servicio' : outOfStock ? 'Sin existencias' : lowStock ? 'Stock bajo' : 'Disponible'}
              </Text>
              <Text size="3" weight="bold" color="blue">
                ${Number(product.price ?? product.salePrice ?? 0).toFixed(2)}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </button>
    </Card>
  );
}
