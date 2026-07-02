// Sipariş oluşturma API'si. Doğrulama ve fiyat sunucuda (src/lib/orders.ts).
// Ödeme sistemi bağlanana kadar siparişler "odeme-bekliyor" durumunda kalır.

import {
  createOrder,
  OrderValidationError,
  type NewOrderInput,
} from "@/lib/orders";

export async function POST(request: Request) {
  let body: NewOrderInput;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const order = createOrder(body);
    return Response.json({ id: order.id }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("Sipariş oluşturulamadı:", err);
    return Response.json(
      { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
