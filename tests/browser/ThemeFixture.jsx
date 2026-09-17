import { useState } from 'react';
import { Button, Input, Card, CardContent, Badge, Dialog, DialogTrigger, DialogContent, DialogTitle, Tabs, TabsList, TabsTrigger, TabsContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../src/components/ui';
import { UiButton, UiInput, UiSelect } from '../../src/components/ui/controls';

export default function ThemeFixture() {
  const [saved, setSaved] = useState('');
  return <main className="max-w-xl mx-auto space-y-4">
    <h1>Controles WebFix</h1>
    <Card><CardContent><Badge variant="success">Activo</Badge>
      <form onSubmit={event => { event.preventDefault(); setSaved(new FormData(event.currentTarget).get('concept')); }}>
        <label htmlFor="concept">Concepto</label><Input id="concept" name="concept" required />
        <label htmlFor="price">Precio</label><UiInput id="price" type="number" min="0" step="0.01" defaultValue="12.50" />
        <label htmlFor="category">Categoría</label><UiSelect id="category" defaultValue="service"><option value="service">Servicio</option><option value="product">Producto</option></UiSelect>
        <label><UiInput type="checkbox" defaultChecked name="available" /> Disponible</label>
        <UiButton type="submit" className="btn-primary">Guardar prueba</UiButton>
      </form><output>{saved}</output>
    </CardContent></Card>
    <Dialog><DialogTrigger><Button>Abrir diálogo</Button></DialogTrigger><DialogContent><DialogTitle>Confirmación de prueba</DialogTitle><Input aria-label="Nombre en diálogo" /><Button>Continuar</Button></DialogContent></Dialog>
    <Tabs defaultValue="sales"><TabsList><TabsTrigger value="sales">Ventas</TabsTrigger><TabsTrigger value="stock">Existencias</TabsTrigger></TabsList><TabsContent value="sales">Detalle de ventas</TabsContent><TabsContent value="stock">Detalle de existencias</TabsContent></Tabs>
    <Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Precio</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Soporte</TableCell><TableCell>$12.50</TableCell></TableRow></TableBody></Table>
  </main>;
}
