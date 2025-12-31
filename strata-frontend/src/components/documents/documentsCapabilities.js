export const documentsCapabilities = {
  manager: {
    canUpload: true,
    canCreateFolder: true,
    canRename: true,
    canDelete: true,
  },
  owner: {
    canUpload: false,
    canCreateFolder: false,
    canRename: false,
    canDelete: false,
  },
  tenant: {
    canUpload: false,
    canCreateFolder: false,
    canRename: false,
    canDelete: false,
  },
};
