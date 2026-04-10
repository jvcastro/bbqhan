import { auth } from "@/auth";
import { ProductsClient } from "@/components/products/products-client";
import { listProductsCatalog } from "@/server/actions/products";

export default async function ProductsPage() {
  const session = await auth();
  const products = await listProductsCatalog();
  return (
    <ProductsClient
      products={products}
      role={session!.user.role}
    />
  );
}
