interface Window {
  __MP_Editor_JSAPI__: {
    invoke: (params: {
      apiName: string
      apiParam: any
      sucCb: (res: any) => void
      errCb: (err: any) => void
    }) => void
  }
}
declare global {
  interface Window {
    MathJax: {
      texReset(): void;
      tex2chtmlPromise(tex: string): Promise<any>;
      // 如果 MDKatex 里还用到别的方法，就继续补
      typesetPromise?(): Promise<void>;
    };
  }
}