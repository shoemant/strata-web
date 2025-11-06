export default function MoveDialog({ open, doc, folders, onClose, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move "{doc?.title}"</DialogTitle>
          <DialogDescription>Select the folder to move this file into.</DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {folders.map(f => (
            <button
              key={f.folder}
              onClick={() => onConfirm(f.folder)}
              className="w-full text-left px-2 py-1 hover:bg-muted rounded"
            >
              {f.folder || "Home"}
            </button>
          ))}
        </div>

        <Button onClick={onClose}>Cancel</Button>
      </DialogContent>
    </Dialog>
  )
}
