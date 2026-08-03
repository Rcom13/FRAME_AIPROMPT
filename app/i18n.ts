export type Locale = "zh-CN" | "zh-TW" | "ja" | "en";

export const LANGUAGE_OPTIONS: Array<{id:Locale;native:string;short:string}> = [
  {id:"zh-CN",native:"简体中文",short:"简中"},
  {id:"zh-TW",native:"繁體中文",short:"繁中"},
  {id:"ja",native:"日本語",short:"日本語"},
  {id:"en",native:"English",short:"EN"},
];

const ui: Record<Locale, Record<string,string>> = {
  "zh-CN": {
    language:"语言",background:"背景模式",cleanCanvas:"纯净画布",focusCreate:"专注创作",orbital:"轨道星球",worldMode:"世界观模式",neural:"神经思维",ideaMode:"灵感发散模式",
    creationHome:"创作首页",history:"创作历史",siteTone:"网站格调",day:"白天",night:"黑夜",followSystem:"跟随系统",profile:"查看用户资料",guest:"访客",noLogin:"未检测到登录信息",
    accountStatus:"账户状态",signedIn:"已通过 ChatGPT 登录",identity:"个人标识",generationModel:"生成模型",unconfigured:"未配置",modelSettings:"AI 模型配置",logout:"退出登录",login:"使用 ChatGPT 登录",
    connectModel:"连接你的模型服务",connectModelDesc:"选择服务商，填写自己的 API Key，读取该账户可用模型并设为网站生成引擎。",close:"关闭配置",selectProvider:"选择模型服务商",openRouterTip:"OpenRouter 可以通过一个 Key 访问数百个不同厂商模型",
    connectApi:"连接 API",encryptionTip:"密钥经 AES-256-GCM 加密后绑定登录账户保存，网页不会从服务器读回明文",accountSaved:"账户已保存",savedKeyPlaceholder:"已安全保存；留空继续使用，输入可替换",keyPlaceholder:"粘贴该服务商的 API Key",hide:"隐藏",show:"显示",
    detecting:"正在识别并读取…",detectModels:"识别服务商并读取模型",selectModel:"选择生成模型",brandTip:"网站会根据模型 ID 自动显示其实际品牌标识",searchModels:"在 {count} 个模型中搜索…",manualModel:"MODEL ID / 手动填写",manualTip:"若服务商没有开放模型列表接口，可以直接填写控制台中的模型 ID。",
    accountConnected:"账户配置已连接",currentEngine:"当前生成引擎",noModel:"尚未选择模型",deleteConfig:"删除账户配置",saveAccount:"保存到账户并使用",
    welcomeBack:"欢迎回来，",creator:"创作者",welcomeDesc:"今天想从故事开始，还是先构建一张画面？选择一个工作台，把灵感变成可以直接交给生成模型的创作语言。",ready:"创作环境已就绪",formatCount:"{video} 个视频模型格式 · {image} 个图片模型格式",
    storyModuleDesc:"从核心创意到剧情结构、分镜脚本和模型专属视频提示词。",enterStory:"进入故事创作",imageModuleDesc:"把画面想法整理成适配主流图片模型的完整视觉提示词。",enterImage:"进入图片创作",
    describeFrame:"描述你想看见的那一帧。",imageIntro:"为关键帧、角色、场景和封面生成可直接使用的图片模型提示词。",imageIdea:"画面创意",imagePurpose:"图片用途",visualStyle:"视觉风格",imageModel:"图片模型",aspect:"画幅比例",referenceImage:"参考图片",optionalVision:"可选 · AI 视觉理解",imageWorkflow:"选择生成方式",workflowText:"文生图",workflowImage:"图生图",workflowMulti:"多参考图生图",workflowTextDesc:"仅根据文字创意构建完整画面提示词",workflowImageDesc:"理解一张源图并按新创意进行重构",workflowMultiDesc:"分别提取多张图片的角色、场景与风格后融合",sourceImage:"源图参考",multiReferences:"多参考图",addSource:"上传或替换源图",addMultiple:"添加参考图片",referenceCount:"{count} / 6 张参考图",referenceRole:"参考职责",referenceNote:"这张图需要提取或保留什么？",globalDirection:"融合要求",globalDirectionPlaceholder:"例如：保留图 1 的人物身份，采用图 2 的场景与图 3 的光影质感",singleReferenceRequired:"图生图模式需要上传一张源图",multiReferenceRequired:"多参考模式至少需要两张参考图",referenceLimit:"最多可以添加 6 张参考图",
    addReference:"添加视觉参考",keepReference:"需要保留的人物、场景、构图或材质",generatingImage:"AI 正在理解画面并组织提示词…",generateImage:"生成图片提示词",multimodalHint:"由多模态 AI 理解创意与参考图 · 不会直接生成图片",promptSuffix:"提示词",copied:"已复制",copyPrompt:"复制提示词",waitingFrame:"填写左侧创意，生成你的第一张画面指令",
    imageStep1:"描述清晰主体与动作",imageStep2:"选择用途与风格",imageStep3:"复制到对应图片模型",
    turnIdea:"把一个灵感变成一支影片。",storyIntro:"从剧情结构到镜头提示词，为 AI 视频创作者打造的前期工作台。",coreIdea:"核心创意",randomIdea:"随机灵感",visualReference:"视觉参考",aiUnderstands:"提交后由 AI 理解",dropImage:"点击或拖入参考图片",maxImage:"JPG / PNG / WebP · 最大 10MB",referenceNote:"补充图片中的人物、场景或需要保留的元素（推荐）",
    genre:"题材",duration:"成片时长",seconds:"秒",platform:"发布平台",promptFormat:"提示词格式",consistency:"角色一致性锁定",consistencyHint:"统一人物、服装、道具与色彩",generatingStory:"AI 正在理解并创作，请稍候…",generateWithImage:"理解图片，生成剧情与分镜",generateStory:"AI 生成剧情与分镜",realGeneration:"真实多模态生成 · 内容可自由导出",
    outline:"剧情大纲",shotScript:"分镜脚本",copyAll:"复制全部提示词",export:"导出",organizing:"正在组织剧情节奏、视觉参考、镜头运动与模型指令",hook:"开场钩子",copy:"复制",narrative:"叙事结构",viewShots:"查看完整分镜脚本",totalShots:"共 {count} 镜 · {seconds} 秒",camera:"运镜",sound:"声音",sample:"示例内容",awaitingTitle:"等待你的第一部作品",awaitingDesc:"完善左侧核心创意与视觉选择，然后让 AI 从零构建专属于这次创意的剧情与分镜。",awaitingAction:"生成后将在这里呈现",
    loginSync:"登录后可将模型配置同步到所有设备",restoring:"正在从账户恢复模型配置…",restored:"已从账户恢复加密模型配置",migrated:"已将本设备的旧配置安全迁移到账户",noAccountConfig:"尚未配置账户模型服务",readingAccountKey:"正在使用账户密钥读取模型…",validatingKey:"正在验证密钥并读取模型…",needKey:"请填写 API Key，或切回账户已保存的服务商",savedCloud:"已加密保存到账户，可在其他设备自动恢复",deletedCloud:"账户中的模型配置已删除",imageRead:"图片视觉特征已读取",chooseImage:"请选择 JPG、PNG 或 WebP 图片",imageTooLarge:"图片不能超过 10MB",notVerified:"{provider} 尚未验证",foundKey:"已找到该服务商的账户密钥",recognized:"已识别 {provider} · 读取到 {count} 个模型",readFailed:"读取模型失败，请检查配置",needModel:"请先选择或填写模型 ID",firstSaveKey:"首次保存或更换服务商时需要填写 API Key",savingSecure:"正在加密并保存到账户…",saveFailed:"保存账户配置失败",deleting:"正在删除账户模型配置…",deleteFailed:"删除账户配置失败",configRequired:"请先在 Profile 中配置 API Key 和生成模型",apiBaseRequired:"请填写 API Base URL",modelService:"模型服务",creationComplete:"AI 已根据当前题材、风格与视觉参考完成创作",generationFailed:"生成失败，请稍后重试。",randomLoaded:"已放入一个随机灵感",negative:"避免项",analysis:"视觉参考解析",
  },
  "zh-TW": {
    language:"語言",background:"背景模式",cleanCanvas:"純淨畫布",focusCreate:"專注創作",orbital:"軌道星球",worldMode:"世界觀模式",neural:"神經思維",ideaMode:"靈感發散模式",
    creationHome:"創作首頁",history:"創作歷史",siteTone:"網站格調",day:"白天",night:"黑夜",followSystem:"跟隨系統",profile:"查看使用者資料",guest:"訪客",noLogin:"未偵測到登入資訊",
    accountStatus:"帳戶狀態",signedIn:"已透過 ChatGPT 登入",identity:"個人識別",generationModel:"生成模型",unconfigured:"未設定",modelSettings:"AI 模型設定",logout:"登出",login:"使用 ChatGPT 登入",
    connectModel:"連接你的模型服務",connectModelDesc:"選擇服務商、填寫自己的 API Key，讀取帳戶可用模型並設為網站生成引擎。",close:"關閉設定",selectProvider:"選擇模型服務商",openRouterTip:"OpenRouter 可透過一個 Key 存取數百個不同廠商模型",
    connectApi:"連接 API",encryptionTip:"密鑰經 AES-256-GCM 加密後綁定登入帳戶儲存，網頁不會從伺服器讀回明文",accountSaved:"帳戶已儲存",savedKeyPlaceholder:"已安全儲存；留空繼續使用，輸入可替換",keyPlaceholder:"貼上該服務商的 API Key",hide:"隱藏",show:"顯示",
    detecting:"正在辨識並讀取…",detectModels:"辨識服務商並讀取模型",selectModel:"選擇生成模型",brandTip:"網站會依模型 ID 自動顯示實際品牌標誌",searchModels:"在 {count} 個模型中搜尋…",manualModel:"MODEL ID / 手動填寫",manualTip:"若服務商未開放模型列表介面，可直接填寫控制台中的模型 ID。",
    accountConnected:"帳戶設定已連接",currentEngine:"目前生成引擎",noModel:"尚未選擇模型",deleteConfig:"刪除帳戶設定",saveAccount:"儲存至帳戶並使用",
    welcomeBack:"歡迎回來，",creator:"創作者",welcomeDesc:"今天想從故事開始，還是先建構一張畫面？選擇一個工作台，把靈感變成能直接交給生成模型的創作語言。",ready:"創作環境已就緒",formatCount:"{video} 個影片模型格式 · {image} 個圖片模型格式",
    storyModuleDesc:"從核心創意到劇情結構、分鏡腳本與模型專屬影片提示詞。",enterStory:"進入故事創作",imageModuleDesc:"把畫面想法整理成適配主流圖片模型的完整視覺提示詞。",enterImage:"進入圖片創作",
    describeFrame:"描述你想看見的那一幀。",imageIntro:"為關鍵幀、角色、場景與封面生成可直接使用的圖片模型提示詞。",imageIdea:"畫面創意",imagePurpose:"圖片用途",visualStyle:"視覺風格",imageModel:"圖片模型",aspect:"畫幅比例",referenceImage:"參考圖片",optionalVision:"可選 · AI 視覺理解",imageWorkflow:"選擇生成方式",workflowText:"文生圖",workflowImage:"圖生圖",workflowMulti:"多參考圖生圖",workflowTextDesc:"僅依文字創意建構完整畫面提示詞",workflowImageDesc:"理解一張來源圖並依新創意重構",workflowMultiDesc:"分別提取多張圖片的角色、場景與風格後融合",sourceImage:"來源圖參考",multiReferences:"多參考圖",addSource:"上傳或替換來源圖",addMultiple:"新增參考圖片",referenceCount:"{count} / 6 張參考圖",referenceRole:"參考職責",referenceNote:"這張圖需要提取或保留什麼？",globalDirection:"融合要求",globalDirectionPlaceholder:"例如：保留圖 1 的人物身分，採用圖 2 的場景與圖 3 的光影質感",singleReferenceRequired:"圖生圖模式需要上傳一張來源圖",multiReferenceRequired:"多參考模式至少需要兩張參考圖",referenceLimit:"最多可以新增 6 張參考圖",
    addReference:"新增視覺參考",keepReference:"需要保留的人物、場景、構圖或材質",generatingImage:"AI 正在理解畫面並組織提示詞…",generateImage:"生成圖片提示詞",multimodalHint:"由多模態 AI 理解創意與參考圖 · 不會直接生成圖片",promptSuffix:"提示詞",copied:"已複製",copyPrompt:"複製提示詞",waitingFrame:"填寫左側創意，生成你的第一張畫面指令",
    imageStep1:"描述清楚主體與動作",imageStep2:"選擇用途與風格",imageStep3:"複製到對應圖片模型",
    turnIdea:"把一個靈感變成一支影片。",storyIntro:"從劇情結構到鏡頭提示詞，為 AI 影片創作者打造的前期工作台。",coreIdea:"核心創意",randomIdea:"隨機靈感",visualReference:"視覺參考",aiUnderstands:"提交後由 AI 理解",dropImage:"點擊或拖入參考圖片",maxImage:"JPG / PNG / WebP · 最大 10MB",referenceNote:"補充圖片中的人物、場景或需要保留的元素（推薦）",
    genre:"題材",duration:"成片時長",seconds:"秒",platform:"發佈平台",promptFormat:"提示詞格式",consistency:"角色一致性鎖定",consistencyHint:"統一人物、服裝、道具與色彩",generatingStory:"AI 正在理解並創作，請稍候…",generateWithImage:"理解圖片，生成劇情與分鏡",generateStory:"AI 生成劇情與分鏡",realGeneration:"真實多模態生成 · 內容可自由匯出",
    outline:"劇情大綱",shotScript:"分鏡腳本",copyAll:"複製全部提示詞",export:"匯出",organizing:"正在組織劇情節奏、視覺參考、鏡頭運動與模型指令",hook:"開場鉤子",copy:"複製",narrative:"敘事結構",viewShots:"查看完整分鏡腳本",totalShots:"共 {count} 鏡 · {seconds} 秒",camera:"運鏡",sound:"聲音",sample:"範例內容",awaitingTitle:"等待你的第一部作品",awaitingDesc:"完善左側核心創意與視覺選擇，讓 AI 從零建構專屬於這次創意的劇情與分鏡。",awaitingAction:"生成後將在此呈現",
    loginSync:"登入後可將模型設定同步至所有裝置",restoring:"正在從帳戶恢復模型設定…",restored:"已從帳戶恢復加密模型設定",migrated:"已將此裝置的舊設定安全遷移至帳戶",noAccountConfig:"尚未設定帳戶模型服務",readingAccountKey:"正在使用帳戶密鑰讀取模型…",validatingKey:"正在驗證密鑰並讀取模型…",needKey:"請填寫 API Key，或切回帳戶已儲存的服務商",savedCloud:"已加密儲存至帳戶，可在其他裝置自動恢復",deletedCloud:"帳戶中的模型設定已刪除",imageRead:"圖片視覺特徵已讀取",chooseImage:"請選擇 JPG、PNG 或 WebP 圖片",imageTooLarge:"圖片不能超過 10MB",notVerified:"{provider} 尚未驗證",foundKey:"已找到該服務商的帳戶密鑰",recognized:"已辨識 {provider} · 讀取到 {count} 個模型",readFailed:"讀取模型失敗，請檢查設定",needModel:"請先選擇或填寫模型 ID",firstSaveKey:"首次儲存或更換服務商時需要填寫 API Key",savingSecure:"正在加密並儲存至帳戶…",saveFailed:"儲存帳戶設定失敗",deleting:"正在刪除帳戶模型設定…",deleteFailed:"刪除帳戶設定失敗",configRequired:"請先在 Profile 中設定 API Key 與生成模型",apiBaseRequired:"請填寫 API Base URL",modelService:"模型服務",creationComplete:"AI 已依目前題材、風格與視覺參考完成創作",generationFailed:"生成失敗，請稍後再試。",randomLoaded:"已放入一個隨機靈感",negative:"避免項",analysis:"視覺參考解析",
  },
  ja: {
    language:"言語",background:"背景モード",cleanCanvas:"クリーンキャンバス",focusCreate:"制作に集中",orbital:"オービタルプラネット",worldMode:"世界観モード",neural:"ニューラルマインド",ideaMode:"発想拡張モード",
    creationHome:"制作ホーム",history:"制作履歴",siteTone:"表示テーマ",day:"ライト",night:"ダーク",followSystem:"システムに合わせる",profile:"プロフィールを表示",guest:"ゲスト",noLogin:"ログイン情報がありません",
    accountStatus:"アカウント状態",signedIn:"ChatGPT でログイン済み",identity:"ユーザーID",generationModel:"生成モデル",unconfigured:"未設定",modelSettings:"AI モデル設定",logout:"ログアウト",login:"ChatGPT でログイン",
    connectModel:"モデルサービスに接続",connectModelDesc:"プロバイダーと API Key を設定し、利用可能なモデルを読み込んで生成エンジンに指定します。",close:"設定を閉じる",selectProvider:"モデルプロバイダーを選択",openRouterTip:"OpenRouter なら1つの Key で多数のモデルにアクセスできます",
    connectApi:"API に接続",encryptionTip:"Key は AES-256-GCM で暗号化しアカウントに保存します。ブラウザへ平文を返しません",accountSaved:"保存済み",savedKeyPlaceholder:"安全に保存済み。空欄で継続、入力すると更新",keyPlaceholder:"プロバイダーの API Key を貼り付け",hide:"隠す",show:"表示",
    detecting:"認識して読み込み中…",detectModels:"プロバイダーを認識してモデルを取得",selectModel:"生成モデルを選択",brandTip:"モデル ID からブランドロゴを自動表示します",searchModels:"{count} モデルから検索…",manualModel:"MODEL ID / 手動入力",manualTip:"モデル一覧 API がない場合は、コンソールのモデル ID を直接入力できます。",
    accountConnected:"アカウント設定に接続済み",currentEngine:"現在の生成エンジン",noModel:"モデル未選択",deleteConfig:"アカウント設定を削除",saveAccount:"アカウントに保存して使用",
    welcomeBack:"おかえりなさい、",creator:"クリエイター",welcomeDesc:"今日は物語から始めますか、それとも一枚の画から？ワークスペースを選び、ひらめきを生成モデルが理解できる制作言語に変えましょう。",ready:"制作環境は準備完了",formatCount:"動画モデル形式 {video} 種 · 画像モデル形式 {image} 種",
    storyModuleDesc:"核となるアイデアから物語構成、絵コンテ、モデル専用動画プロンプトまで。",enterStory:"ストーリー制作へ",imageModuleDesc:"画のアイデアを主要画像モデル向けの完全なビジュアルプロンプトに整理します。",enterImage:"画像制作へ",
    describeFrame:"見たい、その一瞬を描く。",imageIntro:"キーフレーム、キャラクター、シーン、カバー用の画像プロンプトを生成します。",imageIdea:"画のアイデア",imagePurpose:"画像の用途",visualStyle:"ビジュアルスタイル",imageModel:"画像モデル",aspect:"アスペクト比",referenceImage:"参照画像",optionalVision:"任意 · AI 画像理解",imageWorkflow:"生成方法を選択",workflowText:"テキストから画像",workflowImage:"画像から画像",workflowMulti:"複数参照から画像",workflowTextDesc:"テキストのアイデアだけから完全な画像プロンプトを構築",workflowImageDesc:"1枚の元画像を理解し、新しいアイデアで再構成",workflowMultiDesc:"複数画像から人物、場面、スタイルを個別に抽出して融合",sourceImage:"元画像",multiReferences:"複数参照画像",addSource:"元画像を追加または置換",addMultiple:"参照画像を追加",referenceCount:"参照画像 {count} / 6",referenceRole:"参照する役割",referenceNote:"この画像から何を抽出・保持しますか？",globalDirection:"融合の指示",globalDirectionPlaceholder:"例：画像1の人物を保ち、画像2の場面と画像3の照明を採用",singleReferenceRequired:"画像から画像モードには元画像が1枚必要です",multiReferenceRequired:"複数参照モードには2枚以上の画像が必要です",referenceLimit:"参照画像は最大6枚です",
    addReference:"ビジュアル参照を追加",keepReference:"保持する人物、シーン、構図、質感",generatingImage:"AI が画を理解しプロンプトを構成中…",generateImage:"画像プロンプトを生成",multimodalHint:"マルチモーダル AI がアイデアと参照画像を理解 · 画像自体は生成しません",promptSuffix:"プロンプト",copied:"コピー済み",copyPrompt:"プロンプトをコピー",waitingFrame:"左側にアイデアを入力して最初の画面指示を生成",
    imageStep1:"主体と動きを明確に記述",imageStep2:"用途とスタイルを選択",imageStep3:"対応する画像モデルへコピー",
    turnIdea:"ひとつのひらめきを映像へ。",storyIntro:"物語構成からショットプロンプトまで、AI 映像制作者のためのプリプロダクション環境。",coreIdea:"コアアイデア",randomIdea:"ランダム発想",visualReference:"ビジュアル参照",aiUnderstands:"送信後 AI が理解",dropImage:"クリックまたは参照画像をドロップ",maxImage:"JPG / PNG / WebP · 最大 10MB",referenceNote:"画像内で保持する人物、シーン、要素を追記（推奨）",
    genre:"ジャンル",duration:"完成尺",seconds:"秒",platform:"公開先",promptFormat:"プロンプト形式",consistency:"キャラクター一貫性を固定",consistencyHint:"人物・衣装・小物・色を統一",generatingStory:"AI が理解して制作中です…",generateWithImage:"画像を理解して物語と絵コンテを生成",generateStory:"物語と絵コンテを AI 生成",realGeneration:"実際のマルチモーダル生成 · 自由に書き出し可能",
    outline:"ストーリー概要",shotScript:"絵コンテ",copyAll:"全プロンプトをコピー",export:"書き出し",organizing:"物語のリズム、参照画像、カメラワーク、モデル指示を構成中",hook:"冒頭フック",copy:"コピー",narrative:"物語構成",viewShots:"絵コンテ全体を見る",totalShots:"全 {count} ショット · {seconds} 秒",camera:"カメラ",sound:"サウンド",sample:"サンプル内容",awaitingTitle:"最初の作品を待っています",awaitingDesc:"左側のコアアイデアとビジュアル設定を整え、AI に今回だけの物語と絵コンテをゼロから構築させましょう。",awaitingAction:"生成結果はここに表示されます",
    loginSync:"ログインするとモデル設定を全デバイスで同期できます",restoring:"アカウント設定を復元中…",restored:"暗号化されたモデル設定を復元しました",migrated:"この端末の旧設定を安全にアカウントへ移行しました",noAccountConfig:"アカウントのモデルサービスは未設定です",readingAccountKey:"保存済み Key でモデルを読み込み中…",validatingKey:"Key を検証してモデルを読み込み中…",needKey:"API Key を入力するか、保存済みプロバイダーへ戻してください",savedCloud:"暗号化してアカウントに保存しました。他の端末でも復元できます",deletedCloud:"アカウントのモデル設定を削除しました",imageRead:"画像の視覚特徴を読み取りました",chooseImage:"JPG、PNG、WebP 画像を選択してください",imageTooLarge:"画像は 10MB 以下にしてください",notVerified:"{provider} は未検証です",foundKey:"このプロバイダーの保存済み Key が見つかりました",recognized:"{provider} を認識 · {count} モデルを取得",readFailed:"モデルを取得できません。設定を確認してください",needModel:"モデル ID を選択または入力してください",firstSaveKey:"初回保存またはプロバイダー変更時は API Key が必要です",savingSecure:"暗号化してアカウントへ保存中…",saveFailed:"アカウント設定を保存できませんでした",deleting:"アカウント設定を削除中…",deleteFailed:"アカウント設定を削除できませんでした",configRequired:"先に Profile で API Key と生成モデルを設定してください",apiBaseRequired:"API Base URL を入力してください",modelService:"モデルサービス",creationComplete:"現在のジャンル、スタイル、参照画像に基づく制作が完了しました",generationFailed:"生成に失敗しました。しばらくしてから再試行してください。",randomLoaded:"ランダムなアイデアを追加しました",negative:"避ける要素",analysis:"参照画像の分析",
  },
  en: {
    language:"Language",background:"Background",cleanCanvas:"Clean canvas",focusCreate:"Focused creation",orbital:"Orbital planet",worldMode:"Worldbuilding mode",neural:"Neural mind",ideaMode:"Divergent thinking",
    creationHome:"Creation home",history:"Creation history",siteTone:"Appearance",day:"Light",night:"Dark",followSystem:"Follow system",profile:"View profile",guest:"Guest",noLogin:"No sign-in information detected",
    accountStatus:"Account status",signedIn:"Signed in with ChatGPT",identity:"User identity",generationModel:"Generation model",unconfigured:"Not configured",modelSettings:"AI model settings",logout:"Sign out",login:"Sign in with ChatGPT",
    connectModel:"Connect your model service",connectModelDesc:"Choose a provider, add your API Key, load available models, and set the site generation engine.",close:"Close settings",selectProvider:"Choose a model provider",openRouterTip:"OpenRouter gives one Key access to hundreds of models",
    connectApi:"Connect API",encryptionTip:"Keys are encrypted with AES-256-GCM and saved to your account. Plaintext is never returned to the browser",accountSaved:"Saved to account",savedKeyPlaceholder:"Securely saved; leave blank to keep it or type to replace",keyPlaceholder:"Paste this provider's API Key",hide:"Hide",show:"Show",
    detecting:"Detecting and loading…",detectModels:"Detect provider and load models",selectModel:"Choose a generation model",brandTip:"The site identifies and displays the model brand from its ID",searchModels:"Search {count} models…",manualModel:"MODEL ID / MANUAL",manualTip:"If the provider has no model-list endpoint, enter the model ID from its console.",
    accountConnected:"Account configuration connected",currentEngine:"Current generation engine",noModel:"No model selected",deleteConfig:"Delete account config",saveAccount:"Save to account and use",
    welcomeBack:"Welcome back,",creator:"Creator",welcomeDesc:"Begin with a story or build a single frame first. Choose a studio and turn inspiration into production language your generation model can understand.",ready:"Creative environment ready",formatCount:"{video} video model formats · {image} image model formats",
    storyModuleDesc:"Go from a core idea to narrative structure, shot list, and model-specific video prompts.",enterStory:"Enter story studio",imageModuleDesc:"Turn a visual idea into a complete prompt tailored to leading image models.",enterImage:"Enter image studio",
    describeFrame:"Describe the frame you want to see.",imageIntro:"Create ready-to-use prompts for keyframes, characters, environments, and covers.",imageIdea:"Visual concept",imagePurpose:"Image purpose",visualStyle:"Visual style",imageModel:"Image model",aspect:"Aspect ratio",referenceImage:"Reference image",optionalVision:"Optional · AI visual understanding",imageWorkflow:"Choose generation workflow",workflowText:"Text to image",workflowImage:"Image to image",workflowMulti:"Multi-reference image",workflowTextDesc:"Build a complete visual prompt from the written concept alone",workflowImageDesc:"Understand one source image and reconstruct it through a new concept",workflowMultiDesc:"Extract character, setting, and style from separate references, then fuse them",sourceImage:"Source image",multiReferences:"Multiple references",addSource:"Upload or replace source",addMultiple:"Add reference images",referenceCount:"{count} / 6 references",referenceRole:"Reference role",referenceNote:"What should be extracted or preserved from this image?",globalDirection:"Fusion direction",globalDirectionPlaceholder:"Example: keep the identity from image 1, use the setting from image 2 and lighting from image 3",singleReferenceRequired:"Image-to-image mode requires one source image",multiReferenceRequired:"Multi-reference mode requires at least two images",referenceLimit:"You can add up to 6 reference images",
    addReference:"Add visual reference",keepReference:"People, setting, composition, or material to preserve",generatingImage:"AI is understanding the frame and composing the prompt…",generateImage:"Generate image prompt",multimodalHint:"Multimodal AI understands your idea and reference · This tool does not render images",promptSuffix:"Prompt",copied:"Copied",copyPrompt:"Copy prompt",waitingFrame:"Describe your idea on the left to create the first frame direction",
    imageStep1:"Describe a clear subject and action",imageStep2:"Choose purpose and style",imageStep3:"Copy to the matching image model",
    turnIdea:"Turn one idea into a film.",storyIntro:"A pre-production workspace for AI video creators, from narrative structure to shot prompts.",coreIdea:"Core idea",randomIdea:"Random spark",visualReference:"Visual reference",aiUnderstands:"Understood by AI after submission",dropImage:"Click or drop a reference image",maxImage:"JPG / PNG / WebP · 10MB max",referenceNote:"Add people, locations, or visual anchors to preserve (recommended)",
    genre:"Genre",duration:"Duration",seconds:"sec",platform:"Publishing platform",promptFormat:"Prompt format",consistency:"Lock character continuity",consistencyHint:"Keep character, wardrobe, props, and color consistent",generatingStory:"AI is understanding and creating…",generateWithImage:"Understand image and generate story + shots",generateStory:"Generate story and shots",realGeneration:"True multimodal generation · Export anything",
    outline:"Story outline",shotScript:"Shot list",copyAll:"Copy all prompts",export:"Export",organizing:"Organizing story rhythm, visual references, camera motion, and model instructions",hook:"Opening hook",copy:"Copy",narrative:"Narrative structure",viewShots:"View complete shot list",totalShots:"{count} shots · {seconds} sec",camera:"Camera",sound:"Sound",sample:"Sample content",awaitingTitle:"Waiting for your first creation",awaitingDesc:"Refine the core idea and visual choices on the left, then let AI build a story and shot list unique to this concept from scratch.",awaitingAction:"Your generated work will appear here",
    loginSync:"Sign in to sync model settings across devices",restoring:"Restoring model settings from your account…",restored:"Encrypted model settings restored from your account",migrated:"Legacy settings from this device were securely migrated",noAccountConfig:"No account model service configured",readingAccountKey:"Loading models with your saved account key…",validatingKey:"Validating key and loading models…",needKey:"Enter an API Key or switch back to your saved provider",savedCloud:"Encrypted and saved to your account; it will restore on other devices",deletedCloud:"Model configuration deleted from your account",imageRead:"Image visual features loaded",chooseImage:"Choose a JPG, PNG, or WebP image",imageTooLarge:"Image must be 10MB or smaller",notVerified:"{provider} is not verified",foundKey:"Found the saved account key for this provider",recognized:"Recognized {provider} · loaded {count} models",readFailed:"Could not load models; check your configuration",needModel:"Select or enter a model ID first",firstSaveKey:"An API Key is required for first save or provider changes",savingSecure:"Encrypting and saving to your account…",saveFailed:"Could not save account configuration",deleting:"Deleting account model configuration…",deleteFailed:"Could not delete account configuration",configRequired:"Configure an API Key and generation model in Profile first",apiBaseRequired:"Enter an API Base URL",modelService:"Model service",creationComplete:"AI creation completed from the current genre, style, and visual reference",generationFailed:"Generation failed. Please try again.",randomLoaded:"Added a random spark",negative:"Negative / avoid",analysis:"Visual reference analysis",
  },
};

const optionTranslations: Record<Exclude<Locale,"zh-CN">,Record<string,string>> = {
  "zh-TW": {
    "悬疑惊悚":"懸疑驚悚","科幻未来":"科幻未來","治愈情感":"療癒情感","古风奇幻":"古風奇幻","都市反转":"都市反轉","搞笑脑洞":"搞笑腦洞","电影写实":"電影寫實","日系动漫":"日系動漫","3D 动画":"3D 動畫","赛博朋克":"賽博龐克","水墨国风":"水墨國風","复古胶片":"復古底片","商业摄影":"商業攝影","概念艺术":"概念藝術","极简海报":"極簡海報","电影关键帧":"電影關鍵幀","角色设定图":"角色設定圖","场景概念图":"場景概念圖","封面海报":"封面海報","产品视觉":"產品視覺","16:9 横屏":"16:9 橫向","9:16 竖屏":"9:16 直向","1:1 方形":"1:1 方形","4:3 经典":"4:3 經典","21:9 超宽":"21:9 超寬","通用视频模型":"通用影片模型",
  },
  ja: {
    "悬疑惊悚":"ミステリー／スリラー","科幻未来":"SF／未来","治愈情感":"ヒーリング／感情","古风奇幻":"東洋ファンタジー","都市反转":"都会のどんでん返し","搞笑脑洞":"コメディ／奇想","电影写实":"シネマティック実写","日系动漫":"日本アニメ","3D 动画":"3D アニメーション","赛博朋克":"サイバーパンク","水墨国风":"水墨画","复古胶片":"レトロフィルム","商业摄影":"広告写真","概念艺术":"コンセプトアート","极简海报":"ミニマルポスター","电影关键帧":"映画キーフレーム","角色设定图":"キャラクター設定","场景概念图":"環境コンセプト","封面海报":"カバーポスター","产品视觉":"プロダクトビジュアル","16:9 横屏":"16:9 横長","9:16 竖屏":"9:16 縦長","1:1 方形":"1:1 正方形","4:3 经典":"4:3 クラシック","21:9 超宽":"21:9 ウルトラワイド","通用视频模型":"汎用動画モデル",
  },
  en: {
    "悬疑惊悚":"Mystery thriller","科幻未来":"Sci-fi future","治愈情感":"Healing drama","古风奇幻":"Eastern fantasy","都市反转":"Urban twist","搞笑脑洞":"Surreal comedy","电影写实":"Cinematic realism","日系动漫":"Japanese anime","3D 动画":"3D animation","赛博朋克":"Cyberpunk","水墨国风":"Ink-wash Chinese","复古胶片":"Vintage film","商业摄影":"Commercial photography","概念艺术":"Concept art","极简海报":"Minimal poster","电影关键帧":"Film keyframe","角色设定图":"Character design","场景概念图":"Environment concept","封面海报":"Cover poster","产品视觉":"Product visual","16:9 横屏":"16:9 landscape","9:16 竖屏":"9:16 portrait","1:1 方形":"1:1 square","4:3 经典":"4:3 classic","21:9 超宽":"21:9 ultrawide","通用视频模型":"General video model",
  },
};

export function translate(locale:Locale,key:string,values:Record<string,string|number>={}){
  let text=ui[locale][key]??ui["zh-CN"][key]??key;
  for(const [name,value] of Object.entries(values))text=text.replaceAll(`{${name}}`,String(value));
  return text;
}

export function optionLabel(locale:Locale,value:string){
  if(locale==="zh-CN")return value;
  return optionTranslations[locale][value]??value;
}

const referenceRoleTranslations:Record<Locale,Record<string,string>>={
  "zh-CN":{source:"源图整体",subject:"主体",character:"角色身份",scene:"场景",style:"视觉风格",composition:"构图",prop:"道具",color:"色彩与光线"},
  "zh-TW":{source:"來源圖整體",subject:"主體",character:"角色身分",scene:"場景",style:"視覺風格",composition:"構圖",prop:"道具",color:"色彩與光線"},
  ja:{source:"元画像全体",subject:"主題",character:"人物アイデンティティ",scene:"場面",style:"ビジュアルスタイル",composition:"構図",prop:"小物",color:"色と照明"},
  en:{source:"Whole source",subject:"Subject",character:"Character identity",scene:"Setting",style:"Visual style",composition:"Composition",prop:"Prop",color:"Color and lighting"},
};

export function referenceRoleLabel(locale:Locale,value:string){return referenceRoleTranslations[locale][value]??value}

export function preferredLocale(value?:string|null):Locale{
  const code=(value||"").toLowerCase();
  if(code.startsWith("zh-tw")||code.startsWith("zh-hk")||code.startsWith("zh-hant"))return "zh-TW";
  if(code.startsWith("ja"))return "ja";
  if(code.startsWith("en"))return "en";
  return "zh-CN";
}

export const outputLanguage:Record<Locale,string>={"zh-CN":"简体中文","zh-TW":"繁體中文","ja":"日本語","en":"English"};
