export const confirm = (msg = 'Are you sure?') =>
    new Promise(res => res(window.confirm(msg)));
