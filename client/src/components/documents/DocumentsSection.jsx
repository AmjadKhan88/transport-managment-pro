import DocumentsPanel from "./DocumentsPanel";

// For a new record there is no id yet, so ask the user to save first
export default function DocumentsSection({ entityType, entityId }) {
  return (
    <section>
      <h3 className="mb-4 border-b border-gray-200 pb-2 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
        Bills and receipts
      </h3>
      {entityId ? (
        <DocumentsPanel bare title="Attached files" entityType={entityType} entityId={entityId} />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Save this record first, then you can attach the bill or receipt.</p>
      )}
    </section>
  );
}