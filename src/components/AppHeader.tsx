const navItems = ['홈', '추천 코스', '선비 테스트', '선비 한마디']

export function AppHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="영주선비길 홈">
        <span className="brand-mark" aria-hidden="true">
          영
        </span>
        <span>
          <strong>영주선비길</strong>
          <small>YEONGJU SEONBI TRAIL</small>
        </span>
      </a>
      <nav className="main-nav" aria-label="주요 메뉴">
        {navItems.map((item) => (
          <a key={item} href={`#${item.replaceAll(' ', '-')}`}>
            {item}
          </a>
        ))}
      </nav>
      <div className="header-actions" aria-label="서비스 상태">
        <span className="status-pill">공공데이터 연동 전</span>
      </div>
    </header>
  )
}
