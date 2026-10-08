import Select from "./Select";
import { Field } from "./FormParts";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/config/payment";

export default function PaymentFields({ method, status, onChange }) {
  // onChange receives { paymentMethod, paymentStatus }
  return (
    <>
      <Field label="Payment method">
        <Select
          value={method}
          onChange={(e) =>
            onChange({
              paymentMethod: e.target.value,
              paymentStatus: e.target.value === "credit" ? "unpaid" : "paid",
            })
          }
        >
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Payment status" hint={status === "unpaid" ? "Unpaid amounts will show up in Payables." : undefined}>
        <Select value={status} onChange={(e) => onChange({ paymentMethod: method, paymentStatus: e.target.value })}>
          {Object.entries(PAYMENT_STATUSES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </Select>
      </Field>
    </>
  );
}