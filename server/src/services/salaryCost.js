import Employee from "../models/Employee.js";
import SalaryRecord from "../models/SalaryRecord.js";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Salary cost of one department (office / shop), keyed by "YYYY-MM" or "YYYY".
// Cost per record = basic + trip allowance + bonus + other payment - deduction.
// Uses the staff member's current department and includes deleted staff (history stays).
export async function departmentSalaryCosts(
  department,
  { from, to, groupBy = "month" } = {},
) {
  const employeeIds = await Employee.distinct("_id", { department });

  const match = {
    isDeleted: false,
    payeeType: "employee",
    employee: { $in: employeeIds },
  };
  const fromMonth = DAY_RE.test(from || "") ? from.slice(0, 7) : null;
  const toMonth = DAY_RE.test(to || "") ? to.slice(0, 7) : null;
  if (fromMonth || toMonth) {
    match.month = {
      ...(fromMonth && { $gte: fromMonth }),
      ...(toMonth && { $lte: toMonth }),
    };
  }

  const rows = await SalaryRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupBy === "year" ? { $substr: ["$month", 0, 4] } : "$month",
        cost: {
          $sum: {
            $subtract: [
              {
                $add: [
                  "$basicSalary",
                  "$tripAllowance",
                  "$bonus",
                  "$otherPayment",
                ],
              },
              "$deduction",
            ],
          },
        },
      },
    },
  ]);

  return new Map(rows.map((r) => [r._id, r.cost]));
}

export const sumCosts = (map) => [...map.values()].reduce((s, v) => s + v, 0);
