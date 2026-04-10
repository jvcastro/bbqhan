"use client";

import { useTransition } from "react";
import {
  OrderStatus,
  PaymentStatus,
} from "@/generated/prisma/browser";
import { Button } from "@/components/ui/button";
import {
  updateOrderStatus,
  updatePaymentStatus,
} from "@/server/actions/orders";
import { toast } from "sonner";

export function OrderActions({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        toast.success("Updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  if (status === OrderStatus.CANCELLED || status === OrderStatus.COMPLETED) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 touch-manipulation">
      {status === OrderStatus.PENDING ? (
        <Button
          size="lg"
          className="min-h-12 min-w-[7rem]"
          disabled={pending}
          onClick={() =>
            run(() => updateOrderStatus(orderId, OrderStatus.PREPARING))
          }
        >
          Preparing
        </Button>
      ) : null}
      {status === OrderStatus.PREPARING ? (
        <Button
          size="lg"
          className="min-h-12 min-w-[7rem]"
          disabled={pending}
          onClick={() =>
            run(() => updateOrderStatus(orderId, OrderStatus.READY))
          }
        >
          Ready
        </Button>
      ) : null}
      {status === OrderStatus.READY ? (
        <Button
          size="lg"
          className="min-h-12 min-w-[7rem]"
          disabled={pending}
          onClick={() =>
            run(() => updateOrderStatus(orderId, OrderStatus.COMPLETED))
          }
        >
          Complete
        </Button>
      ) : null}
      {paymentStatus === PaymentStatus.UNPAID ? (
        <Button
          size="lg"
          variant="secondary"
          className="min-h-12 min-w-[7rem]"
          disabled={pending}
          onClick={() =>
            run(() => updatePaymentStatus(orderId, PaymentStatus.PAID))
          }
        >
          Mark paid
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="min-h-12 min-w-[7rem]"
          disabled={pending}
          onClick={() =>
            run(() => updatePaymentStatus(orderId, PaymentStatus.UNPAID))
          }
        >
          Unpaid
        </Button>
      )}
      <Button
        size="lg"
        variant="destructive"
        className="min-h-12 min-w-[7rem]"
        disabled={pending}
        onClick={() =>
          run(() => updateOrderStatus(orderId, OrderStatus.CANCELLED))
        }
      >
        Cancel
      </Button>
    </div>
  );
}
