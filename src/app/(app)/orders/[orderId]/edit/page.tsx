import { notFound } from "next/navigation";
import { EditOrderForm } from "@/components/orders/edit-order-form";
import { getOrderForEdit } from "@/server/actions/orders";
import { listProductsForOrders } from "@/server/actions/products";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const [order, products] = await Promise.all([
    getOrderForEdit(orderId),
    listProductsForOrders(),
  ]);
  if (!order) notFound();
  return <EditOrderForm order={order} products={products} />;
}
