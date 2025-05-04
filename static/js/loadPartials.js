document.addEventListener('DOMContentLoaded', async () => {
  try {
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');

    if (partialUrls.nav) {
      const navResponse = await fetch(partialUrls.nav);
      if (navResponse.ok) {
        headerContainer.innerHTML = await navResponse.text();
      } else {
        console.error(`Error loading nav: ${navResponse.statusText}`);
      }
    }

    if (partialUrls.footer) {
      const footerResponse = await fetch(partialUrls.footer);
      if (footerResponse.ok) {
        footerContainer.innerHTML = await footerResponse.text();
      } else {
        console.error(`Error loading footer: ${footerResponse.statusText}`);
      }
    }
  } catch (error) {
    console.error('Error loading partials:', error);
  }
});
