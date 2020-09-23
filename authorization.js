/*
 * example user
 *
{
  given_name: 'Tri D.',
  family_name: 'Nguyen',
  nickname: 'tringuyenduy',
  name: 'Tri D. Nguyen',
  picture: 'https://lh3.googleusercontent.com/a-/AOh14GiTfUMRmBg2yLYEhrBBjXRIJPT5UBP94QmWroXvJQ',
  locale: 'en',
  updated_at: '2020-07-19T16:27:14.736Z',
  email: 'tringuyenduy@gmail.com',
  email_verified: true,
  iss: 'https://tridnguyen.auth0.com/',
  sub: 'google-oauth2|102956012089794272878',
  aud: 'IxcfVZqCVF9b5FS2NVVnElOeBnoNG02Z',
  iat: 1595388637,
  exp: 1595475037,
  at_hash: 'ssDYjGXWsj-zGXr6tMgJ5A',
  nonce: 'w0b5xKhP0all8p0471MmV~YfztqpYQyw'
}
 */
const superAdmins = ["google-oauth2|102956012089794272878", "testuser"];
function isUserSuperAdmin(user) {
  return superAdmins.includes(user.sub);
}
function isUserAdmin(user, listData) {
  return listData.admins.includes(user.sub);
}

function isUserEditor(user, listData) {
  const editors = listData.admins.concat(listData.editors);
  return editors.includes(user.sub);
}

function isUserViewer(user, listData) {
  const viewers = listData.admins.concat(listData.viewers, listData.editors);
  if (!viewers.includes("public") && !viewers.includes(user.sub)) {
    return false;
  }
  return true;
}

module.exports = {
  isUserSuperAdmin,
  isUserAdmin,
  isUserEditor,
  isUserViewer,
};
