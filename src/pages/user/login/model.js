import { history } from 'umi';
import { message } from 'antd';
import { fakeAccountLogin, getFakeCaptcha } from './service';
import { getPageQuery, setAuthority } from './utils/utils';
import * as api from '@/api';

const Model = {
  namespace: 'userAndlogin',
  state: {
    status: undefined,
  },
  effects: {
    *login({ payload }, { call, put }) {
      try {
        const response = yield call(api.login, payload);
        yield put({
          type: 'changeLoginStatus',
          payload: response,
        }); // Login successfully

        message.success('登录成功！');
        const { token, user_info, menulist, permissions, is_superuser } = response.data;
        const userInfo = { ...user_info, token, menulist, permissions, is_superuser };
        localStorage.setItem('user_info', JSON.stringify(userInfo));

        yield put({
          type: 'currentUser/save',
          userInfo
        })

        const urlParams = new URL(window.location.href);
        const params = getPageQuery();
        let { redirect } = params;

        // if (redirect) {
        //   const redirectUrlParams = new URL(redirect);

        //   if (redirectUrlParams.origin === urlParams.origin) {
        //     redirect = redirect.substr(urlParams.origin.length);

        //     if (redirect.match(/^\/.*#/)) {
        //       redirect = redirect.substr(redirect.indexOf('#') + 1);
        //     }
        //   } else {
        //     window.location.href = redirect;
        //     return;
        //   }
        // }

        // history.replace(redirect || '/app/project');
        history.replace('/app/project');
      } catch (error) {
        yield put({
          type: 'changeLoginStatus',
          payload: { status: 'error', type: 'account' },
        });
      }
    },

    *getCaptcha({ payload }, { call }) {
      yield call(getFakeCaptcha, payload);
    },
  },
  reducers: {
    changeLoginStatus(state, { payload }) {
      setAuthority(payload.currentAuthority);
      return { ...state, status: payload.status, type: payload.type };
    },
  },
};
export default Model;
