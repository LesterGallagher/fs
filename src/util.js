
export const randId = () => {
    return Math.floor(Math.random() * 9007199254740992).toString(36);
}

export const fileMeta = fileBlob => {
    const { lastModified, lastModifiedDate, name, path, size, type, webkitRelativePath } = fileBlob;
    return { lastModified, lastModifiedDate, name, path, size, type, webkitRelativePath }
}
