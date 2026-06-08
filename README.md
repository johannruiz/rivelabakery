# Rivela Web

Sitio estatico para catalogo, carrito y pedido por WhatsApp.

## Probar en localhost

En Windows, abre:

```text
start-localhost.bat
```

Luego entra en el navegador a:

```text
http://localhost:8000/
```

Para detener el servidor, vuelve a la ventana de la terminal y presiona `Ctrl + C`.

## Base de datos

La base de productos y opciones del checkout esta en:

```text
data/products.json
```

En `settings` puedes editar:

- `promoBanner`: texto del banner superior. Cada bloque puede llevar `"highlight": true` para mostrarse en rosado y negrilla.
- `deliveryTypes`: tipos de entrega.
- `paymentMethods`: metodos de pago.
- `timeSlots`: horarios disponibles del checkout.
- `cheesecakeBuilder`: opciones del modal "Crea tu cheesecake".

En `products` puedes agregar, quitar o cambiar productos. Los precios estan en pesos colombianos como numero entero, por ejemplo `12900`, y la web los muestra como `$12.900`.

## Crea tu cheesecake

El configurador esta en `settings.cheesecakeBuilder`.

Puedes editar:

- `bases`: bases disponibles con precio.
- `flavors`: sabores disponibles con precio.
- `toppings`: toppings opcionales con precio por unidad.
- `defaultVisual`: dibujo o imagen por defecto.
- `combinationImages`: imagen para una combinacion especifica.

Formato de una opcion con precio:

```json
{
  "name": "Ferrero",
  "price": 12000
}
```

Ejemplo de imagen por combinacion:

```json
{
  "base": "Clasico",
  "flavor": "Ferrero",
  "topping": "Ferrero",
  "visual": "cheesecake-ferrero.webp"
}
```

La imagen debe estar en `assets/images`.

## Imagenes de productos

Guarda las fotos en:

```text
assets/images
```

Luego en el producto cambia `visual` por el nombre exacto del archivo:

```json
"visual": "brownie-cacao.webp"
```

Si `visual` tiene un nombre como `cake`, `brownie`, `cheesecake`, `gugelhupf`, `box` o `croissant`, la web usa el dibujo interno. Si `visual` termina en `.webp`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg` o `.avif`, la web busca esa imagen en `assets/images`.

Tamano recomendado:

- Productos en tarjetas: imagen cuadrada de `1200 x 1200 px`.
- Tambien funciona `1600 x 1200 px` si la foto es horizontal.
- Usa formato `.webp` cuando puedas, idealmente por debajo de `300 KB` por imagen.
- Mantén el producto centrado y deja aire alrededor, porque la web recorta la foto para llenar el espacio.
