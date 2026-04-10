import { NewOrderForm } from "@/components/orders/new-order-form";
import { listProductsForOrders } from "@/server/actions/products";

export default async function NewOrderPage() {
  const products = await listProductsForOrders();
  return <NewOrderForm products={products} />;
}
