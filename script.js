// ---------- Supabase init (fixed) ----------
// GANTI INI DENGAN URL & KEY SUPABASE ANDA
const SUPABASE_URL =                "https://kphzljwphndxezuwdwdz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaHpsandwaG5keGV6dXdkd2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjUzNjEsImV4cCI6MjA3ODM0MTM2MX0.kt33VysK_vpSqdsaHLJzz4Uxx247RfAG6zk4ZceQ-pc";

// use the global 'supabase' script to get createClient
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("✅ Supabase client initialized");

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => { n = Number(n)||0; return 'Rp' + n.toLocaleString('id-ID'); };
function escapeHTML(s){ if(!s) return ''; return String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c)); }



// === ICON MATA (TAMPIL SALDO) ===
const ICON_EYE = `
<svg class="balance-icon-svg" xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 20 20" fill="currentColor">
<path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
<path fill-rule="evenodd" 
  d="M0.664 10.59a1.651 1.651 0 010-1.18l0.879-0.659A11.09 11.09 0 0110 6.5
     c1.886 0 3.68 0.49 5.21 0.879l0.879 0.659a1.651 1.651 0 010 1.18l-0.879 0.659
     A11.09 11.09 0 0110 13.5c-1.886 0-3.68-0.49-5.21-0.879l-0.879-0.659z
     M10 11.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" 
  clip-rule="evenodd" />
</svg>
`;

// === ICON MATA TERTUTUP (SEMBUNYIKAN SALDO) ===
const ICON_EYE_SLASH = `
<svg class="balance-icon-svg" xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 20 20" fill="currentColor">
<path fill-rule="evenodd" 
  d="M3.707 3.293a1 1 0 010 1.414l1.528 1.528A10.478 10.478 0 0010 5.5
     c4.418 0 8.167 2.672 9.336 5.09a1.651 1.651 0 010 1.18
     10.48 10.48 0 01-2.538 3.057l1.495 1.495a1 1 0 11-1.414 1.414l-15-15a1 1 0 011.414-1.414z
     M14.12 15.12l-1.489-1.489A4.002 4.002 0 016 10
     c0-.469.082-.916.232-1.333L3.808 6.243C2.422 7.21 1.455 8.435 0.664 9.41
     a1.651 1.651 0 000 1.18C1.833 12.328 5.582 15 10 15
     c1.477 0 2.877-.28 4.12-.78z" 
  clip-rule="evenodd" />
</svg>
`;

/** Renders the star rating based on the average rating. **/
function renderStar(rating){
  rating = Math.round(rating * 2) / 2; // round to nearest half star
  let stars = '';
  for(let i=1; i<=5; i++){
      if(i <= rating) stars += '★'; // Full star
      else if (i - 0.5 === rating) stars += '½'; // Half star
      else stars += '☆'; // Empty star
  }
  return `<span class="rating" style="letter-spacing:1px">${stars.replace('½','½ ')}</span>`;
}


function getStorageUrl(bucketName, filePath) {
  if (!filePath) return '';

  // 🔽 TAMBAHAN: Membersihkan path jika sudah mengandung nama bucket
  const pathPrefix = bucketName + '/';
  if (filePath.startsWith(pathPrefix)) {
    filePath = filePath.substring(pathPrefix.length);
  }
  // 🔼 SELESAI TAMBAHAN

  // Menggunakan instance Supabase client (sb) yang sudah dideklarasikan
  const { data } = sb.storage
    .from(bucketName) 
    .getPublicUrl(filePath); // filePath sekarang sudah bersih

  // getPublicUrl mengembalikan objek { publicUrl: 'URL' }
  return data.publicUrl;
}

function getProductImageUrl(filePath) { return getStorageUrl('products', filePath); }
function getAvatarUrl(filePath) { return getStorageUrl('avatars', filePath); } 

function createFallbackSvg(text, size=100, fontSize=18) {
  if (!text) text = '??';
  const initials = encodeURIComponent((text.trim().slice(0,2) || '??').toUpperCase());
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<rect width="100%" height="100%" fill="#F0EFFF"/>
<text x="50%" y="50%" font-size="${fontSize}" fill="%235D3A9B"
  font-family="Arial, sans-serif" text-anchor="middle" dominant-baseline="central">
  ${initials}
</text>
</svg>`;
return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

let otherUserId = null; // ID lawan bicara (chat partner)
let chatChannel = null;
let currentUser = null;
let currentProductId = null; 
let isBalanceHidden = false;
let unreadCount = 0;
let currentConversationId = null;
let currentChatSubscription = null;
let isConnecting = false;
let notifications = [];
let notificationChannels = [];
let newNotificationCount = 0;
let currentNotifFilter = 'all';

// small toast
function toast(msg, time=2200){
  const el = document.createElement('div'); el.className='toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), time);
}

// ---------- UI helpers ----------
function showPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.page===id));
  
  if(id === 'home') loadHomeProducts();
  if(id === 'profile' && currentUser) renderProfile(); 
  if(id === 'my-shop' && currentUser) loadMyProducts();
  if(id === 'finance') loadFinancePage();
  if(id === 'chat') loadChatListPage();
  if(id === 'bank-account' || id === 'finance') populateAccountDetails();
  if(id === 'upload-product') populateCategoryDropdown();
  
  // PERUBAHAN: Muat keranjang saat halaman keranjang dibuka
  if(id === 'cart') loadCart();
  
  if (id !== 'chat-detail') {
      unsubscribeFromChat();
  }
}
async function openSellerShop(sellerId) {
  showPage('seller-shop');

  // Ambil referensi elemen dengan aman
  const productsContainer = $('#seller-products');
  const shopNameEl = $('#seller-shop-name');
  const shopAvatarEl = $('#seller-shop-avatar');
  
  // 1. Reset tampilan awal (dengan null check)
  if (shopNameEl) shopNameEl.textContent = 'Memuat...';
  if (productsContainer) productsContainer.innerHTML = '<div class="p-3 text-center">Memuat produk...</div>';

  try {
      // 2. Ambil data profil penjual
      // ❌ PERBAIKAN DILAKUKAN DI BARIS DI BAWAH INI (Menghapus 'email')
      const { data: profileData, error: profileError } = await sb
          .from('profiles')
          .select('id, full_name, avatar_url') // ✅ Kolom 'email' telah dihapus
          .eq('id', sellerId)
          .single();

      if (profileError || !profileData) {
          console.error('Gagal memuat profil penjual. Error Supabase:', profileError); 
          
          if (shopNameEl) shopNameEl.textContent = 'Penjual tidak ditemukan';
          if (productsContainer) productsContainer.innerHTML = '<div class="small text-center">Data penjual tidak tersedia. (Cek RLS)</div>';
          return;
      }

      // 3. Tampilkan data penjual (dengan null check untuk menghindari TypeError)
      const sellerName = profileData.full_name || 'Penjual Anonim';
      const sellerAvatarUrl = profileData.avatar_url || 'https://via.placeholder.com/150/0000FF/FFFFFF?text=AV'; // Ganti dengan URL avatar default Anda

      if (shopNameEl) shopNameEl.textContent = escapeHTML(sellerName);
      if (shopAvatarEl) shopAvatarEl.src = sellerAvatarUrl;

      // 4. Ambil produk dari penjual
      const { data: products, error: prodError } = await sb
          .from('products')
          .select('*, product_reviews(rating)')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });

      if (prodError) throw prodError;
console.log("Data Produk dari Supabase:", products); 
  
      // 5. Render produk
      if (productsContainer) {
          productsContainer.innerHTML = ''; // Hapus status memuat
        
          if (products.length === 0) {
              productsContainer.innerHTML = '<div class="card p-3 text-center">Penjual ini belum memiliki produk yang diunggah.</div>';
          } else {
              products.forEach(product => {
                  // Asumsi: renderProductCard adalah fungsi yang sudah Anda definisikan
                  productsContainer.appendChild(renderProductCard(product));
              });
          }
      }

  } catch (err) {
      console.error('Error openSellerShop:', err);
      if (shopNameEl) shopNameEl.textContent = 'Terjadi Kesalahan';
      if (productsContainer) productsContainer.innerHTML = `<div class="small text-center">Gagal memuat toko: ${err.message || 'Terjadi kesalahan'}.</div>`;
  }
}

function renderProductCard(product) {
    const card = document.createElement('div');
    // ... (kode lainnya)

    // Dapatkan URL gambar dari fungsi Anda
    let imageUrl = getProductImageUrl(product.file_url); 
    
    // ⭐ BARIS PERBAIKAN UTAMA: Tambahkan Fallback Placeholder
    if (!imageUrl) {
        // Ganti URL ini dengan URL gambar placeholder yang Anda inginkan
        imageUrl = 'https://via.placeholder.com/250x250?text=No+Image'; 
    }

    card.innerHTML = `
        <div class="p-2">
            <img src="${imageUrl}" // ✅ src kini dijamin terisi
                 alt="${escapeHTML(product.title)}" 
                 style="width:100%; height:100px; object-fit:cover; border-radius:8px;">
        </div>
        <div class="p-2">
            // ... (detail produk lainnya)
        </div>
    `;
    
    return card;
}



// --- Profile Rendering V2 ---
async function renderProfile() {

    if (!currentUser) {
        $('#profile-name').textContent = '-';
        $('#profile-email').textContent = '-';
        $('#profile-balance').textContent = 'Rp0';
        $('#profile-avatar').innerHTML = 'U';
        return;
    }

    // Ambil data user auth
    const { data: userData } = await sb.auth.getUser();
    currentUser = userData?.user || currentUser;

    // 🔥 Ambil data profil dari tabel profiles
    const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", currentUser.id)
        .single();

    if (profileErr) {
        console.warn("Gagal ambil profile:", profileErr.message);
    }

    const name = profile?.full_name || currentUser.email || "User";
    const avatarPath = profile?.avatar_url || null;

    // --- Tampilkan Nama & Email ---
    $('#profile-name').textContent = name;
    $('#profile-email').textContent = currentUser.email;

    // --- Balance (tetap pakai metadata auth) ---
    const metadata = currentUser.user_metadata || {};
    const balanceEl = $('#profile-balance');
    const toggleBtn = $('#btn-toggle-balance');
    const realBalance = metadata.balance || 0;

    balanceEl.dataset.balance = realBalance;

    if (isBalanceHidden) {
        balanceEl.textContent = 'Rp ••••••••';
        toggleBtn.innerHTML = ICON_EYE_SLASH;
    } else {
        balanceEl.textContent = fmt(realBalance);
        toggleBtn.innerHTML = ICON_EYE;
    }

    // --- Tampilkan Avatar ---
    const avatarEl = $('#profile-avatar');
    const fallbackSvg = createFallbackSvg(name, 60, 24);

    if (avatarPath) {
        const finalUrl = getAvatarUrl(avatarPath);
        avatarEl.innerHTML = `
            <img src="${finalUrl}" 
                 alt="Avatar"
                 onerror="this.onerror=null; this.src='${fallbackSvg}'">
        `;
    } else {
        avatarEl.innerHTML = `<img src="${fallbackSvg}">`;
    }
}

async function uploadAvatar(e) {
  if (!currentUser) return toast('Login dulu');
  const file = e.target.files[0];
  if (!file) return;

  const avatarEl = document.getElementById('profile-avatar');
  const oldContent = avatarEl.innerHTML;
  avatarEl.innerHTML = `<div style="font-size:24px; line-height:60px;">...</div>`;

  try {
    // 1. Buat nama file unik
    const filename = `${currentUser.id}_${Date.now()}.${file.name.split('.').pop()}`;

    // 2. Upload ke Supabase Storage
    const { data, error } = await sb.storage
      .from('avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
        metadata: { owner: currentUser.id }
      });

    if (error) throw error;
    
    // --- PERBAIKAN KRITIS DI SINI ---

    // ❌ GANTI INI: Anda tidak perlu mengupdate sb.auth.updateUser() jika Anda menggunakan tabel 'profiles'.
    /* const { data: updateData, error: updateError } = await sb.auth.updateUser({
      data: { avatar_url: filename }
    });
    if (updateError) throw updateError;

    currentUser = updateData.user;
    */

    // ✅ GANTI DENGAN INI: Update kolom avatar_url di tabel 'profiles'
    const { error: updateError } = await sb
        .from('profiles')
        .update({ avatar_url: filename }) // Gunakan filename (path) dari hasil upload
        .eq('id', currentUser.id);         // Pastikan hanya baris pengguna ini yang diupdate

    if (updateError) throw updateError;
    
    // Opsional: Perbarui objek currentUser secara manual 
    // agar renderProfile() yang ada di kode Anda dapat langsung menampilkan avatar baru
    currentUser.user_metadata = currentUser.user_metadata || {};
    currentUser.user_metadata.avatar_url = filename;

    // --- AKHIR PERBAIKAN KRITIS ---

    renderProfile();
    toast('Foto profil berhasil diubah.');

  } catch (err) {
    console.error('uploadAvatar', err);
    toast('Gagal upload: ' + (err.message || 'Error'));

    avatarEl.innerHTML = oldContent;
  }
}

function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const balanceEl = $('#profile-balance');
    const toggleBtn = $('#btn-toggle-balance');
    const realBalance = balanceEl.dataset.balance || 0;

    if (isBalanceHidden) {
        balanceEl.textContent = 'Rp ••••••••';
        toggleBtn.innerHTML = ICON_EYE_SLASH;
    } else {
        balanceEl.textContent = fmt(realBalance);
        toggleBtn.innerHTML = ICON_EYE;
    }
}

function showHelpModal() {
    $('#help-modal').classList.add('active');
}
function hideHelpModal() {
    $('#help-modal').classList.remove('active');
}

function loadFinancePage() {
    if (!currentUser) return showPage('auth');
    populateAccountDetails();
    loadWithdraws();
    loadAffiliateStats();
}

function showFinanceTab(tabName) {
    $$('.tab-content').forEach(c => c.classList.remove('active'));
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    
    $(`#tab-content-${tabName}`).classList.add('active');
    $(`#btn-tab-${tabName}`).classList.add('active');
}


async function checkout() {
  if (!currentUser) return toast('Login dulu');
  
  const { data: items, error } = await sb
    .from('carts')
    .select('product_id, qty, products(price, seller_id)')
    .eq('owner', currentUser.id);

  if (error || !items || !items.length) {
    toast('Keranjang kosong atau error');
    return;
  }

  const total = items.reduce((a, b) => a + (b.products?.price || 0) * b.qty, 0);

  const { data: order, error: orderError } = await sb
    .from('orders')
    .insert([{ user_id: currentUser.id, total }])
    .select()
    .single();

  if (orderError) {
    console.error(orderError);
    return toast('Gagal checkout. Pastikan tabel orders sudah ada dan RLS benar.');
  }

  const orderItems = items.map(i => ({
    order_id: order.id,
    product_id: i.product_id,
    price: i.products.price,
    quantity: i.qty,
    seller_id: i.products.seller_id
  }));

  await sb.from('order_items').insert(orderItems); 
  await sb.from('carts').delete().eq('owner', currentUser.id); 

  toast('Checkout berhasil 🎉. Order ID: ' + order.id);
  loadCart();
}

// ---------- Auth ----------
async function initAuth(){
    sb.auth.onAuthStateChange((event, session) => {
      if(session && session.user){
        currentUser = session.user;
        postLoginSetup();
      } else {
        currentUser = null;
        onLogout();
      }
    });
}

$('#btn-checkout').addEventListener('click', checkout);
$('#btn-logout').addEventListener('click', signOut); 

async function signOut(){
  try{
    await sb.auth.signOut();
    currentUser = null;
    onLogout();
    toast('Logout berhasil');
  }catch(err){ console.error('signOut', err); toast('Gagal logout');}
}

function onLogout(){
  renderProfile();
  loadHomeProducts();
  loadCategories();
  loadCart();
  unsubscribeFromChat();
  unsubscribeFromNotifications();
  showPage('auth');
  $('#review-form-container')?.classList.remove('hidden');
  $('#review-form-login-note')?.classList.remove('hidden');
  $('#review-form-logged-in')?.classList.add('hidden');
}

async function postLoginSetup(){
  renderProfile();
  await loadHomeProducts();
  await loadCategories();
  await loadCart();
  await loadMyProducts();
  
  subscribeToNotifications(); 
  
  $('#review-form-login-note')?.classList.add('hidden');
  $('#review-form-logged-in')?.classList.remove('hidden');
  showPage('home');
}


// Carousel (simple) - VERSI TANPA JQUERY
const banners = [
  { imgUrl: 'baner1.png' }, 
  { imgUrl: 'baner2.png' }, 
  { imgUrl: 'baner3.png' }
];
let carouselIdx = 0;

function renderCarousel(){
  // Menggunakan document.getElementById (JavaScript murni)
  const img = document.getElementById('carousel-img');
  const dots = document.getElementById('carousel-dots');
  
  if (!img || !dots) return; // Hentikan jika elemen tidak ditemukan
  
  img.src = banners[carouselIdx].imgUrl; 
  img.alt = "Banner " + (carouselIdx + 1); 
  
  dots.innerHTML = banners.map((b,i)=>`<div class="dot ${i===carouselIdx? 'active':''}"></div>`).join('');
}

// Set interval untuk mengganti gambar
setInterval(()=>{ 
  carouselIdx = (carouselIdx + 1) % banners.length; 
  renderCarousel(); 
}, 4000);

// Panggil fungsi pertama kali saat halaman dimuat
renderCarousel();

// ---------- Affiliate tracking (di dalam Halaman Finance) ----------
async function trackAffiliateClick(refId, productId){
  if(!refId) return;
  try{
    const { data: existing, error: selErr } = await sb.from('affiliates').select('*').eq('user_id', refId).eq('product_id', productId).limit(1);
    if(selErr) { console.warn('aff select err', selErr); }
    
    const payload = { user_id: refId, product_id: productId, last_click_at: new Date().toISOString() };
    
    if(existing && existing.length){
      const rec = existing[0];
      await sb.from('affiliates').update({ clicks: (rec.clicks||0)+1, ...payload }).eq('id', rec.id);
    } else {
      await sb.from('affiliates').insert([{ clicks: 1, sales: 0, commission_total: 0, created_at: new Date().toISOString(), ...payload }]);
    }
    console.log('Affiliate click tracked for', refId, productId);
  }catch(err){
    console.error('trackAffiliateClick', err);
  }
}

function createAffiliateLink(productId){
  if(!currentUser) return '';
  const base = location.origin + location.pathname;
  if(productId) return `${base}?ref=${encodeURIComponent(currentUser.id)}&product=${encodeURIComponent(productId)}`;
  return `${base}?ref=${encodeURIComponent(currentUser.id)}`;
}

async function copyAffiliateLink(){
  const val = $('#affiliate-link').value;
  if(!val) return alert('Login untuk membuat link afiliasi');
  try{
    await navigator.clipboard.writeText(val);
    toast('Link afiliasi disalin');
  }catch(err){
    prompt('Salin manual link afiliasi ini:', val);
  }
}

async function loadAffiliateStats(){
  if(!currentUser) return;
  const affStatsEl = $('#aff-stats');
  if (!affStatsEl) return;
  
  affStatsEl.textContent = 'Memuat statistik...';
  try{
    const { data, error } = await sb.from('affiliates').select('product_id, clicks, sales, commission_total').eq('user_id', currentUser.id);
    if(error) throw error;
    if(!data || !data.length) { 
  affStatsEl.textContent = 'Belum ada aktivitas afiliasi';
  return;
}
const totalClicks = data.reduce((a,b)=>a+(b.clicks||0),0);
const totalSales = data.reduce((a,b)=>a+(b.sales||0),0);
const totalCommission = data.reduce((a,b)=>a+(b.commission_total||0),0);

affStatsEl.innerHTML = `
  <div>👁️ Klik: <strong>${totalClicks}</strong></div>
  <div>💰 Penjualan: <strong>${totalSales}</strong></div>
  <div>💎 Komisi Total: <strong>${fmt(totalCommission)}</strong></div>
`;
}catch(err){
  console.error('loadAffiliateStats', err);
  affStatsEl.textContent = 'Gagal memuat statistik afiliasi.';
}
}

// ---------- Products & Categories ----------
async function loadTrendingProducts() {
  $('#trending-products').innerHTML = '<div class="small">Memuat Trending (Berdasarkan Sales)...</div>';
  try {
    const { data, error } = await sb.from('products')
      .select('*, product_reviews(rating)') 
      .order('sales_count', { ascending: false }) 
      .order('created_at', { ascending: false }) 
      .limit(4);
    if(error) throw error;
    renderProductsGrid(data||[],'#trending-products');
  }catch(err){
      $('#trending-products').innerHTML = '<div class="small">Gagal memuat: '+err.message+'</div>';
      console.error('loadTrendingProducts', err);
  }
}

async function loadLatestProducts(q='') {
  $('#latest-products').innerHTML = '<div class="small">Memuat produk terbaru...</div>';
  try{
    let query = sb.from('products').select('*, product_reviews(rating)').order('created_at',{ascending:false}).limit(8);
    
    if(q) {
      const searchString = `%${q}%`;
      query = sb.from('products')
        .select('*, product_reviews(rating)')
        .or(`title.ilike.${searchString},category.ilike.${searchString}`)
        .order('created_at',{ascending:false})
        .limit(60);
      
      $('#trending-products').innerHTML = `<div class="small">Hasil pencarian untuk: <strong>${escapeHTML(q)}</strong></div>`;
    } else {
      loadTrendingProducts();
    }
    
    const { data, error } = await query;
    if(error) throw error;
    renderProductsGrid(data||[],'#latest-products');
  }catch(err){
    $('#latest-products').innerHTML = '<div class="small">Gagal memuat: '+err.message+'</div>';
    console.error('loadLatestProducts', err);
  }
} 

function loadHomeProducts(q=''){ 
    loadLatestProducts(q); 
} 

function renderProductsGrid(list, selector){ 
  const container = document.querySelector(selector); 
  container.innerHTML = ''; 
  if(!list.length) return container.innerHTML = '<div class="small">Belum ada produk</div>'; 
  list.forEach(p=>{ 
    const ratings = p.product_reviews?.map(r => r.rating) || []; 
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0; 
    const imageUrl = getProductImageUrl(p.file_url); 
    const fallbackSvg = createFallbackSvg(p.title || '');
    const el = document.createElement('div'); 
    el.className='product'; 
    el.onclick = ()=> showProductDetail(p.id); 
    el.innerHTML = ` 
      <div class="p-thumb"> 
        ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHTML(p.title)}" onerror="this.onerror=null; this.src='${fallbackSvg}';"/>` : `<img src="${fallbackSvg}" alt="Fallback"/>`}
      </div> 
      <div class="p-title">${escapeHTML(p.title||'Untitled')}</div> 
      <div class="p-meta">${escapeHTML(p.category||'')}</div> 
      <div class="p-meta" style="font-weight:700">${fmt(p.price||0)}</div> 
      <div class="p-meta" style="margin-top:2px;display:flex;align-items:center;gap:4px;"> 
        ${renderStar(avgRating)} 
        <span style="font-size:11px;color:var(--muted)">(${ratings.length})</span> 
      </div> 
      <div class="p-actions" style="margin-top:10px"> 
        <button class="btn" data-buy-now="${p.id}" onclick="event.stopPropagation();">Beli Sekarang</button> 
      </div>`; 
    container.appendChild(el); 
  }); 
  
  // PERUBAHAN LISTENER TOMBOL: dari [data-add] ke [data-buy-now]
  container.querySelectorAll('button[data-buy-now]').forEach(b=>b.onclick = async (e)=> { 
    e.stopPropagation(); 
    const productId = b.dataset.buyNow;
    await addToCart(productId); // Tetap tambahkan ke keranjang
    showPage('cart'); // Langsung pindah ke halaman keranjang
  }); 
}

// --- Product Detail Page (PDP) Logic --- 
function showProductDetail(id){ 
  currentProductId = id; 
  loadProductDetail(id); 
  showPage('product-detail'); 
} 

async function loadProductDetail(id){ 
  const container = $('#product-detail-content'); 
  container.innerHTML = 'Memuat...';
  try{
      const { data: product, error: prodError } = await sb
  .from('products')
  .select('*, product_reviews(*, profiles:user_id(full_name, avatar_url)), seller:seller_id(full_name)')
  .eq('id', id)
  .single();



      if (prodError) throw prodError;
      if (!product) throw new Error('Produk tidak ditemukan');

      const ratings = product.product_reviews?.map(r => r.rating) || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      
      const sellerName = product.seller?.full_name || 'Penjual Anonim';
      const sellerId = product.seller_id;

      const imageUrl = getProductImageUrl(product.file_url);
      const fallbackSvg = createFallbackSvg(product.title || '');

      container.innerHTML = `
        <div class="p-thumb" style="height:180px; margin-bottom:12px">
           ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHTML(product.title)}" onerror="this.onerror=null; this.src='${fallbackSvg}';"/>` : `<img src="${fallbackSvg}" alt="Fallback"/>`}
        </div>
        <h2>${escapeHTML(product.title)}</h2>
<div class="small" style="margin-top:-8px; margin-bottom:12px;">
  Penjual: 
  <strong style="color:var(--brand); cursor:pointer; text-decoration:underline;" 
          onclick="openSellerShop('${sellerId}')">
    ${escapeHTML(sellerName)}
  </strong>
</div>

        <div class="card" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
           <div style="flex:1">
               <div class="price">${fmt(product.price)}</div>
               <div style="font-size:12px; color:var(--muted)">Kategori: ${escapeHTML(product.category)}</div>
           </div>
           <div style="text-align:right">
               ${renderStar(avgRating)}
               <div class="rating-text">${ratings.length} ulasan</div>
           </div>
        </div>
        
        <div class="card">
            <h4>Deskripsi</h4>
            <p class="small" style="white-space:pre-wrap; color:var(--text)">${escapeHTML(product.description || 'Tidak ada deskripsi.')}</p>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px">
          <button id="btn-pd-buy" class="btn" style="flex:2">Beli Sekarang</button>
          <button id="btn-pd-cart" class="btn-outline" style="flex:1">🛒</button>
          <button id="btn-pd-chat-seller" class="btn-outline" style="flex:1">💬 Chat</button>
        </div>

        <div style="margin-top:24px"> 
          <h4>Ulasan Produk (<span id="pd-review-count">${ratings.length}</span>)</h4> 
          <div id="review-form-container" class="card" style="margin-bottom:12px"> 
            <div id="review-form-login-note" class="small ${currentUser ? 'hidden':''}"></div> 
            <div id="review-form-logged-in" class="${currentUser ? '':'hidden'}"> 
              <div style="font-weight:700;margin-bottom:6px">Beri Penilaianmu:</div> 
              <div class="star-rating" id="review-rating-input"> 
                <input type="radio" id="star5" name="rating" value="5" /><label for="star5">★</label> 
                <input type="radio" id="star4" name="rating" value="4" /><label for="star4">★</label> 
                <input type="radio" id="star3" name="rating" value="3" /><label for="star3">★</label> 
                <input type="radio" id="star2" name="rating" value="2" /><label for="star2">★</label> 
                <input type="radio" id="star1" name="rating" value="1" /><label for="star1">★</label> 
              </div> 
              <textarea id="review-text" placeholder="Tulis ulasan produk..." rows="3" style="margin-top:8px"></textarea> 
              <button id="btn-submit-review" class="btn" style="margin-top:8px">Kirim Ulasan</button> 
              <div id="review-note" class="small muted-note"></div> 
            </div> 
          </div> 
          <div id="product-review-list"></div> 
        </div> `; 

      renderReviews(product.product_reviews); 
      $('#btn-pd-buy').onclick = () => alert('Pembayaran belum diimplementasikan (dummy).'); 
      $('#btn-pd-cart').onclick = () => addToCart(product.id); 
      document.getElementById('btn-submit-review')?.addEventListener('click', submitReview); 
      
      $('#btn-pd-chat-seller').onclick = () => {
          if(!currentUser) return toast('Login untuk chat dengan penjual');
          if(currentUser.id === sellerId) return toast('Anda tidak dapat chat dengan diri sendiri');
          startChatWithUser(sellerId, sellerName);
      };
  }catch(err){ 
      container.innerHTML = `<h2>Gagal Memuat Produk</h2><p>${err.message}</p><button class="btn-outline" onclick="showPage('home')">Kembali</button>`; 
      console.error('loadProductDetail', err); 
  } 
} 

async function renderReviews(reviews){ 
  const listEl = $('#product-review-list'); 
  listEl.innerHTML = ''; 

  if (!reviews || reviews.length === 0) { 
      listEl.innerHTML = '<div class="small">Belum ada ulasan.</div>'; 
      return; 
  } 

  reviews.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); 

  reviews.forEach(r => { 
      const name = r.profiles?.full_name || ('Pengguna ' + r.user_id.slice(0, 8));
      const avatar = r.profiles?.avatar_url 
          ? getAvatarUrl(r.profiles.avatar_url) 
          : createFallbackSvg(name, 40, 16);

      const dateText = new Date(r.created_at).toLocaleDateString('id-ID');

      const div = document.createElement('div');
      div.className = 'review-list-item';
      div.innerHTML = `
          <div style="display:flex; gap:10px; align-items:center;">
              <img src="${avatar}" 
                   style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />
              
              <div style="flex:1;">
                  <div style="font-weight:600">${escapeHTML(name)}</div>
                  <div class="small">${dateText}</div>
              </div>
          </div>

          <div style="margin-top:4px;">${renderStar(r.rating)}</div>
          <p class="small" style="margin:4px 0;">${escapeHTML(r.review_text || '')}</p>
      `;

      listEl.appendChild(div);
  });
}

async function submitReview(){ 
  if(!currentUser || !currentProductId) return toast('Login atau pilih produk dulu'); 
  const rating = Number(document.querySelector('#review-rating-input input:checked')?.value);
  const text = $('#review-text').value.trim();

  if(!rating || !text) return $('#review-note').textContent = 'Rating dan ulasan harus diisi.';

  $('#review-note').textContent = 'Mengirim ulasan...';
  try{
      const { error } = await sb.from('product_reviews').insert([{ 
          product_id: currentProductId, 
          user_id: currentUser.id, 
          rating, 
          review_text: text, 
          created_at: new Date().toISOString() 
      }]);
      if(error) throw error;
      
      $('#review-note').textContent = 'Ulasan terkirim!';
      $('#review-text').value = '';
      document.querySelectorAll('#review-rating-input input:checked').forEach(r => r.checked = false); 
      
      loadProductDetail(currentProductId); 
  }catch(err){ 
      $('#review-note').textContent = 'Gagal: ' + err.message; 
      console.error('submitReview', err); 
  } 
} 

// ---------- CATEGORIES (DIUBAH) ---------- 
const DEFAULT_CATEGORIES = [ 
  { name: "Ebook", icon: "📚" }, 
  { name: "Template", icon: "🎨" }, 
  { name: "Musik", icon: "🎵" }, 
  { name: "Desain", icon: "🖌️" }, 
  { name: "Video", icon: "🎬" }, 
  { name: "Plugin", icon: "⚙️" }, 
  { name: "Script / Code", icon: "💻" }, 
  { name: "Kursus Online", icon: "🎓" }, 
  { name: "Aplikasi", icon: "📱" }, 
  { name: "Font / Typografi", icon: "🔤" }, 
  { name: "Lainnya", icon: "🗂️" } 
]; 
async function loadCategories() { 
  const container = document.getElementById('categories-list'); 
  const homeCats = document.getElementById('home-cats'); 
  if (!homeCats) return; 
  homeCats.innerHTML = '<div class="small">Memuat...</div>'; 
  if(container) container.innerHTML = '<div class="small">Memuat kategori...</div>'; 
  try { 
    const { data: products, error } = await sb.from('products').select('category'); 
    if (error) throw error; 
    const counts = {}; 
    (products || []).forEach(p => { 
      const cat = (p.category || 'Lainnya').trim(); 
      counts[cat] = (counts[cat] || 0) + 1; 
    }); 
    
    const existingCatNames = new Set(DEFAULT_CATEGORIES.map(c => c.name));
    Object.keys(counts).forEach(catName => {
        if (!existingCatNames.has(catName)) {
            DEFAULT_CATEGORIES.push({ name: catName, icon: "🗂️" });
            existingCatNames.add(catName);
        }
    });

    const allCats = DEFAULT_CATEGORIES.map(c => ({ ...c, count: counts[c.name] || 0 })); 
    homeCats.innerHTML = ''; 
    allCats.slice(0,5).forEach(c=>{
      const div=document.createElement('div'); 
      div.className='cat'; 
      div.innerHTML=`<div style='font-size:24px'>${c.icon}</div><div style='margin-top:2px;font-weight:600'>${escapeHTML(c.name)}</div>`; 
      div.onclick=()=> filterByCategory(c.name); 
      homeCats.appendChild(div); 
    }); 
    renderCategories(allCats); 
    populateCategoryDropdown();
  } catch (err) { 
    console.error('loadCategories', err); 
    if(container) container.innerHTML = '<div class="small">Gagal memuat kategori.</div>'; 
    homeCats.innerHTML = '<div class="small">Gagal memuat.</div>'; 
  } 
}

function populateCategoryDropdown() {
    const selectEl = $('#product-category');
    if (!selectEl) return;
    
    const currentValue = selectEl.value;
    selectEl.innerHTML = '<option value="">Pilih Kategori...</option>';
    
    DEFAULT_CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = `${cat.icon} ${cat.name}`;
        selectEl.appendChild(opt);
    });
    
    if (currentValue) selectEl.value = currentValue;
}

function renderCategories(list) { 
  const container = document.getElementById('categories-list'); 
  if (!container) return; 
  
  container.innerHTML = ''; 
  if (list.length === 0) { 
    container.innerHTML = '<div class="small">Kategori tidak ditemukan.</div>'; 
    return; 
  }
  list.forEach(c => {
    const div = document.createElement('div');
    div.className = 'card cat';
    div.style.textAlign = 'left';
    div.style.padding = '10px';
    div.style.boxShadow = 'none';
    div.style.border = '1px solid rgba(0,0,0,0.06)';
    div.innerHTML = `<div style='font-size:20px; display:inline-block; margin-right:8px'>${c.icon}</div><div style='font-weight:700; display:inline-block;'>${escapeHTML(c.name)}</div> <div class='small' style='margin-top:4px'>${c.count} produk</div>`;
    div.onclick = () => filterByCategory(c.name);
    container.appendChild(div);
  });
} 

async function filterByCategory(category) {
  showPage('home');
  $('#trending-products').innerHTML = ''; 
  $('#latest-products').innerHTML = `<div class="small">Memuat produk kategori: <strong>${escapeHTML(category)}</strong>...</div>`;
  
  try{
      const { data, error } = await sb.from('products')
          .select('*, product_reviews(rating)')
          .eq('category', category)
          .order('created_at',{ascending:false})
          .limit(60);
      if(error) throw error;
      renderProductsGrid(data||[],'#latest-products');
  }catch(err){
      $('#latest-products').innerHTML = '<div class="small">Gagal memuat produk: '+err.message+'</div>';
      console.error('filterByCategory', err);
  }
}


// Fungsi untuk mengambil dan menampilkan pesan lama
async function loadMessages(convId) {
  const container = $('#chat-bubbles-container');
  if (!convId || !container) return; 

  try {
      const { data: messages, error } = await sb
          .from('messages')
          .select('*')
          // Pastikan RLS mengizinkan SELECT berdasarkan convId
          .eq('conversation_id', convId) 
          .order('created_at', { ascending: true });

      if (error) throw error;
      
      container.innerHTML = ''; // Hapus pesan 'Memuat pesan...'
      
      if (Array.isArray(messages) && messages.length > 0) {
          messages.forEach(message => {
              const isMe = message.sender_id === currentUser.id;
              // Pastikan fungsi ini ada:
              renderChatMessage(message, isMe); 
          });
      } else {
          container.innerHTML = '<div class="small" style="text-align:center">Belum ada pesan. Mulai chat sekarang!</div>';
      }

      container.scrollTop = container.scrollHeight;

  } catch (err) {
      console.error('loadMessages error:', err);
      container.innerHTML = `<div class="small text-danger" style="text-align:center">❌ Gagal memuat pesan: ${err.message}. Cek RLS tabel 'messages'.</div>`;
  }
}
 async function markConversationAsRead(conversationId) {
    // Memastikan user dan ID percakapan ada
    if (!currentUser || !conversationId) return;

    // 1. Update Status di Database Supabase
    try {
        const { error } = await sb
            .from('messages')
            .update({ is_read: true }) // Set kolom is_read menjadi TRUE
            .eq('conversation_id', conversationId) // Untuk percakapan ini
            .neq('sender_id', currentUser.id); // HANYA pesan yang dikirim oleh lawan bicara

        if (error) throw error;
    } catch (err) {
        console.error('Gagal memperbarui status pesan di DB:', err);
    }

    // 2. Update UI (Sembunyikan titik hijau di daftar chat secara instan)
    // '$' adalah helper querySelector yang sudah Anda definisikan
    const chatListItem = $(`[data-conv-id="${conversationId}"]`);
    if (chatListItem) {
        const indicator = chatListItem.querySelector('.unread-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }
}

async function startChatWithUser(otherUserId) {
    if (!currentUser) return toast('Login dulu');

    // --- PERBAIKAN: LOCK UNTUK MENCEGAH RACE CONDITION ---
    if (isConnecting) {
        console.warn('Percobaan connect chat terlalu cepat, diabaikan.');
        return; 
    }
    isConnecting = true; // Kunci proses

    if (currentUser.id === otherUserId) {
        isConnecting = false;
        return toast("Anda tidak bisa chat dengan diri sendiri.");
    }
    // ----------------------------------------------------

    try {
        // 1. Ambil data profil lawan chat dari tabel profiles
        const { data: userProfile, error: profileErr } = await sb
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', otherUserId)
            .single();

        if (profileErr || !userProfile) {
            console.error("Gagal ambil profil lawan chat:", profileErr);
            throw new Error("Gagal memuat info pengguna");
        }

        const otherUserName = userProfile.full_name || 'Pengguna';
        const filePath = userProfile.avatar_url;
        // Asumsi getAvatarUrl sudah didefinisikan
        const imgUrl = filePath ? getAvatarUrl(filePath) : null;
        const fallback = otherUserName[0].toUpperCase();

        // 2. Render avatar ke chat-detail
        const avatarBox = $('#chat-detail-avatar');
        if (imgUrl) {
            avatarBox.innerHTML = `
                <img src="${imgUrl}" class="chat-avatar-img"
                     onerror="this.src='https://via.placeholder.com/80?text=${fallback}'">
            `;
        } else {
            avatarBox.innerHTML = `<div class="chat-avatar-fallback">${fallback}</div>`;
        }

        // 3. Render nama user di header
        $('#chat-detail-header-name').textContent = otherUserName;
        $('#chat-bubbles-container').innerHTML = 'Memuat pesan...';

        showPage('chat-detail');

        // 4. Buka / buat percakapan lewat RPC
        // --- PERBAIKAN PGRST202 DI SINI: Gunakan parameter yang disarankan (p_target_user_id, p_user_id) ---
        const { data: rpcResult, error: rpcError } = await sb.rpc(
            'get_or_create_conversation',
            { 
                p_target_user_id: otherUserId, // Lawan bicara
                p_user_id: currentUser.id      // Pengguna saat ini
            }
        );

        if (rpcError) throw rpcError;

        const convId = rpcResult?.id || rpcResult?.conversation_id || rpcResult;
        if (!convId) throw new Error("RPC tidak mengembalikan ID");

        currentConversationId = convId;

        // 5. Tandai pesan sebagai sudah terbaca (menggunakan AWAIT)
        await markConversationAsRead(convId); 

        // 6. Muat Pesan Lama (menggunakan AWAIT)
        await loadMessages(convId);
        
        // 7. Subscribe Realtime
        // --- PERBAIKAN CLOSED STATUS DI SINI: Wajib menggunakan AWAIT ---
        await subscribeToMessages(convId);
        // ------------------------------------------------------------
        
    } catch (err) {
        console.error("startChatWithUser error:", err);
 
       toast("Gagal membuka chat: " + err.message);
    } finally {
        // --- PERBAIKAN: UNLOCK PROSES ---
        isConnecting = false;
        // ---------------------------------
    }
}

// Fungsi untuk merender satu item daftar chat (conversation)
function renderConversationListItem(conversation, otherUser) {
  const listItem = document.createElement('div');
  listItem.className = 'list-item'; // Tambahkan class untuk styling

  // 1. Tambahkan event listener untuk membuka chat
  // Panggil startChatWithUser saat item diklik
  listItem.onclick = () => startChatWithUser(otherUser.id, otherUser.full_name);

  // 2. Dapatkan URL Avatar (menggunakan fungsi yang sudah Anda buat)
  const avatarUrl = getAvatarUrl(otherUser.avatar_url);
  const fallbackText = otherUser.full_name ? otherUser.full_name[0].toUpperCase() : '?';

  // 3. Buat HTML untuk item daftar
  listItem.innerHTML = `
      <div class="avatar-container">
          ${avatarUrl 
              ? `<img src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(otherUser.full_name)}" class="avatar">` 
              : `<div class="avatar-fallback">${fallbackText}</div>`}
      </div>
      <div class="list-content">
          <div class="list-title">${escapeHTML(otherUser.full_name || 'Pengguna Tidak Dikenal')}</div>
          <div class="list-snippet small text-muted">
              Klik untuk memulai chat...
          </div>
      </div>
      <div class="list-meta small text-muted">
          ${new Date(conversation.created_at).toLocaleDateString('id-ID')}
      </div>
  `;

  return listItem;
}

// PERBAIKAN CHAT: Menggunakan msg.content
function renderChatMessage(msg, autoScroll) {
    if (!currentUser) return;
    
    const container = $('#chat-bubbles-container');
    const div = document.createElement('div');
    const isSent = msg.sender_id === currentUser.id;
    
    div.className = isSent ? 'chat-message sent' : 'chat-message';
    // Menggunakan msg.content sesuai screenshot
    div.innerHTML = `<div class="msg-text">${escapeHTML(msg.content)}</div>`; 
    
    container.appendChild(div);
    
    if (autoScroll) {
        scrollToChatBottom();
    }
}

function scrollToChatBottom() {
    const chatBox = $('#chat-detail-box');
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function unsubscribeFromChat() {
    if (currentChatSubscription) {
        console.log('Unsubscribing from chat:', currentConversationId);
        await sb.removeChannel(currentChatSubscription);
        currentConversationId = null;
    }
}

// Tambahkan 'async'
async function subscribeToMessages(convId) {
    // 1. TUNGGU sampai channel lama benar-benar bersih
    await unsubscribeFromChat();
    
    if (!currentUser || !convId) return;

    console.log(`🔌 Mencoba connect ke chat room: ${convId}...`);
    $('#chat-detail-status').textContent = 'Menghubungkan...';

    // 2. Mulai koneksi baru
    currentChatSubscription = sb.channel(`chat_${convId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `conversation_id=eq.${convId}`,
        }, (payload) => {
            console.log('📩 Pesan masuk:', payload.new);
            if (payload.new.sender_id !== currentUser.id) {
                renderChatMessage(payload.new, true); 
            }
        })
        .subscribe((status, err) => {
            console.log(`Status Chat: ${status}`); // Debug log
            
            if (status === 'SUBSCRIBED') {
                console.log('✅ Chat Realtime Terhubung!');
                const statusEl = document.getElementById('chat-detail-status');
                if (statusEl) statusEl.textContent = 'Online';
            } else if (status === 'CLOSED') {
                console.warn('⚠️ Koneksi ditutup. Mencoba reconnect dalam 2 detik...');
                // Opsional: Auto-reconnect sederhana
                setTimeout(() => subscribeToMessages(convId), 2000);
            } else {
                console.error(`❌ Error Realtime: ${status}`, err);
                const statusEl = document.getElementById('chat-detail-status');
                if (statusEl) statusEl.textContent = 'Offline';
            }
        });
}

// PERBAIKAN CHAT: Menggunakan content
async function sendChatMessage() {
    const input = $('#chat-detail-input');
    const messageText = input.value.trim();
    
    if (!messageText || !currentUser || !currentConversationId) {
        return;
    }
    
    const tempMessage = {
        sender_id: currentUser.id,
        content: messageText, // Menggunakan content
        created_at: new Date().toISOString()
    };
    
    renderChatMessage(tempMessage, true);
    input.value = '';
    
    try {
        const { error } = await sb.from('messages').insert({
            conversation_id: currentConversationId,
            sender_id: currentUser.id,
            content: messageText // Menggunakan content
        });
        
        if (error) throw error;
        console.log('Pesan terkirim ke DB');
        const receiverId = otherUserId; // Asumsi 'otherUserId' adalah lawan bicara
    if (receiverId && receiverId !== currentUser.id) {
        await sb.from('notifications').insert({
            user_id: receiverId, // ID penerima
            type: 'new_message',
            title: 'Pesan Baru 💬',
            message: `Pesan dari ${currentUser.user_metadata?.full_name || 'Seseorang'}`,
            is_read: false
        });
    }
    } catch (err) {
        console.error('sendChatMessage', err);
        toast('Gagal mengirim pesan.');
    }
}
// TAMBAHKAN FUNGSI BARU INI DI SCRIPT.JS
// GANTI SELURUH FUNGSI clearChatHistory YANG LAMA DENGAN KODE INI
async function clearChatHistory() {
    if (!currentConversationId || !currentUser) {
        return toast('Tidak ada percakapan yang dipilih.');
    }

    if (!confirm('Yakin ingin menghapus SELURUH percakapan ini? Pesan akan terhapus permanen dan percakapan akan hilang dari daftar Anda.')) {
        return;
    }

    const container = $('#chat-bubbles-container');
    container.innerHTML = '<div class="small" style="text-align:center">Menghapus riwayat...</div>';
    
    // Sembunyikan tombol hapus saat proses berlangsung
    $('#btn-clear-chat').style.display = 'none';

    try {
        // 1. Hapus SEMUA pesan yang terkait dengan conversation_id ini
        const { error: msgError } = await sb
            .from('messages')
            .delete()
            .eq('conversation_id', currentConversationId); 

        if (msgError) {
            // RLS (Row Level Security) mungkin menolak penghapusan pesan.
            throw new Error('Gagal hapus pesan: ' + msgError.message);
        }

        // 2. Hapus BARIS percakapan dari tabel 'conversations'
        // PENTING: Tindakan ini akan menghapus percakapan dari daftar Anda (dan daftar lawan bicara, tergantung RLS)
        const { error: convError } = await sb
            .from('conversations')
            .delete()
            .eq('id', currentConversationId);

        if (convError) {
             // Jika gagal di sini, biasanya RLS yang menolak penghapusan baris 'conversations'
            console.warn("Gagal hapus baris conversation:", convError);
            // Kita tetap melanjutkan ke UI, karena pesan sudah terhapus
        }

        // 3. Berhasil. Bersihkan UI dan pindah halaman.
        toast('Percakapan berhasil dihapus.');
        
        // Pindah kembali ke halaman daftar chat
        showPage('chat');
        
        // Muat ulang daftar percakapan untuk menghilangkan item yang baru dihapus
        // Asumsi: Anda memiliki fungsi loadConversations()
        if (typeof loadConversations === 'function') {
            loadConversations(); 
        } else {
             // Jika loadConversations tidak ada, Anda perlu memastikan elemen DOM dihapus secara manual
             console.warn("Fungsi loadConversations() tidak ditemukan. Daftar chat mungkin tidak ter-refresh.");
        }
        
        // Reset ID percakapan saat ini
        currentConversationId = null; 

    } catch (err) {
        console.error('clearChatHistory error:', err);
        
        // Tampilkan error ke pengguna
        toast('Gagal menghapus percakapan: ' + err.message);
        
        // Tampilkan kembali tombol jika terjadi kegagalan fatal
        $('#btn-clear-chat').style.display = 'flex';
        
        // Muat ulang chat bubble
        loadMessages(currentConversationId); 
    }
}


// ---------- MY SHOP IMPLEMENTATION (DIPERBARUI DGN HAPUS) ----------
async function loadMyProducts(){
  const listEl = $('#my-products-list');
  if (!listEl) return; 
  
  if(!currentUser) {
      listEl.innerHTML = '<div class="small">Silakan login untuk melihat toko Anda.</div>';
      return;
  }

  listEl.innerHTML = '<div class="small">Memuat produk...</div>';
  
  try{
      const { data: products, error } = await sb.from('products')
          .select('*') 
          .eq('seller_id', currentUser.id)
          .order('created_at', { ascending: false });

      if(error) throw error;

      const totalProducts = (products || []).length;
      const totalSales = (products || []).reduce((sum, p) => sum + (p.sales_count || 0), 0);
      const totalViews = (products || []).reduce((sum, p) => sum + (p.view_count || 0), 0); 

      $('#shop-stat-products').textContent = totalProducts;
      $('#shop-stat-sales').textContent = totalSales;
      $('#shop-stat-views').textContent = totalViews;

      renderMyProductsGrid(products || []);

  }catch(err){
      listEl.innerHTML = `<div class="small">Gagal memuat produk: ${err.message}.</div>`;
      console.error('loadMyProducts', err);
  }
}

function renderMyProductsGrid(list){
  const container = $('#my-products-list');
  container.innerHTML = '';
  if(!list.length) return container.innerHTML = '<div class="small">Anda belum mengunggah produk apapun.</div>';

  list.forEach(p=>{
      const imageUrl = getProductImageUrl(p.file_url);
      const fallbackSvg = createFallbackSvg(p.title || '', 60, 20); 
      const el = document.createElement('div');
      el.className = 'my-product-item';
      
      const sales = p.sales_count || 0;
      const views = p.view_count || 0; 
      
      el.innerHTML = `
          <div class="my-product-thumb" onclick="showProductDetail('${p.id}')">
              ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHTML(p.title)}" onerror="this.onerror=null; this.src='${fallbackSvg}';"/>` : `<img src="${fallbackSvg}" alt="Fallback"/>`}
          </div>
          <div class="my-product-info" onclick="showProductDetail('${p.id}')">
              <div style="font-weight:700; font-size:15px">${escapeHTML(p.title||'Untitled')}</div>
              <div class="small" style="color:var(--brand); font-weight:600">${fmt(p.price||0)}</div>
          </div>
          <div class="my-product-stats">
              <div>Terjual: <strong style="color:#059669">${sales}</strong></div>
              <div>Dilihat: ${views}</div>
              <button class="delete-product-btn" data-id="${p.id}" data-file="${p.file_url}">Hapus</button>
          </div>
      `;
      container.appendChild(el);
  });
  
  container.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.onclick = (e) => {
          e.stopPropagation();
          const id = e.target.dataset.id;
          const file = e.target.dataset.file;
          deleteProduct(id, file);
      };
  });
}

async function deleteProduct(productId, fileUrl) {
    if (!currentUser) return toast('Login dulu');
    
    if (!confirm(`Yakin ingin menghapus produk ini? Tindakan ini tidak bisa dibatalkan.`)) {
        return;
    }
    
    toast('Menghapus produk...');
    
    try {
        const { error: dbError } = await sb.from('products')
            .delete()
            .eq('id', productId)
            .eq('seller_id', currentUser.id);
            
        if (dbError) throw dbError;
        
        if (fileUrl) {
            const { error: storageError } = await sb.storage
                .from('products')
                .remove([fileUrl]);
            
            if (storageError) {
                console.warn('Gagal hapus file storage (mungkin sudah terhapus):', storageError.message);
            }
        }
        
        toast('✅ Produk berhasil dihapus');
        loadMyProducts();
        loadCategories();
        
    } catch (err) {
        console.error('deleteProduct error:', err);
        toast('❌ Gagal menghapus: ' + err.message);
    }
}


// ---------- Cart (PERUBAHAN BESAR) ---------- 
async function addToCart(productId){ 
  if(!currentUser) return alert('Silakan login dulu'); 
  try{ 
    const { data: exists } = await sb.from('carts').select('*').eq('owner', currentUser.id).eq('product_id', productId).limit(1); 
    if(exists && exists.length){ 
      const rec = exists[0]; 
      await sb.from('carts').update({ qty: (rec.qty||1)+1 }).eq('id', rec.id); 
    } else { 
      await sb.from('carts').insert([{ owner: currentUser.id, product_id: productId, qty:1, created_at: new Date().toISOString() }]); 
    } 
    await loadCart(); 
    toast('Ditambahkan ke keranjang'); 
  }catch(err){ 
    alert('Gagal: '+err.message); 
    console.error('addToCart', err); 
  } 
} 

async function loadCart(){ 
  const container = $('#cart-list');
  container.innerHTML = '<div class="small">Memuat keranjang...</div>'; 
  $('#cart-count').textContent='0'; 
  $('#cart-total').textContent='Rp0'; 
  
  try{ 
    if(!currentUser) {
        container.innerHTML = '<div class="small">Silakan login untuk melihat keranjang</div>'; 
        return;
    }
    
    const { data, error } = await sb.from('carts')
        .select('id, qty, products(id, title, price, file_url)') // Query lebih spesifik
        .eq('owner', currentUser.id)
        .order('created_at',{ascending:false}); 
        
    if(error) throw error; 
    
    renderCart(data||[]); 
    
  }catch(err){ 
    container.innerHTML = '<div class="small">Gagal memuat keranjang: '+err.message+'</div>'; 
    console.error('loadCart', err); 
  } 
} 

// === FUNGSI RENDER CART BARU ===
function renderCart(items){ 
  const container = $('#cart-list'); 
  container.innerHTML=''; 
  
  // PERBAIKAN FETCH ERROR: Filter item jika produknya null (sudah dihapus)
  const validItems = items.filter(r => r.products);
  
  if(!validItems.length){ 
    container.innerHTML='<div class="small" style="text-align:center; padding: 20px 0;">Keranjang kosong</div>'; 
    $('#cart-count').textContent='0'; 
    $('#cart-total').textContent='Rp0'; 
    return; 
  } 
  
  let total=0; 
  
  validItems.forEach(r=>{ 
    const p = r.products; // 'p' dijamin tidak null di sini
    const row = document.createElement('div'); 
    row.className='cart-item'; 
    
    const imageUrl = getProductImageUrl(p.file_url);
    const fallbackSvg = createFallbackSvg(p.title || '', 64, 20);
    
    row.innerHTML = `
      <div class="cart-item-thumb">
          <img src="${imageUrl}" alt="${escapeHTML(p.title)}" onerror="this.onerror=null; this.src='${fallbackSvg}';"/>
      </div>
      <div class="cart-item-info">
          <div class="title">${escapeHTML(p.title)}</div>
          <div class="price">${fmt(p.price || 0)}</div>
          <div class="qty">Qty: ${r.qty || 1}</div>
      </div>
      <div class="cart-item-actions">
          <button class="btn-delete-cart" data-remove="${r.id}">Hapus</button>
      </div>
    `;
    container.appendChild(row); 
    total += (p.price||0)*(r.qty||1); 
  }); 
  
  $('#cart-count').textContent = validItems.length; 
  $('#cart-total').textContent = fmt(total); 
  
  // Pasang listener untuk tombol hapus BARU
  container.querySelectorAll('.btn-delete-cart').forEach(b=>b.onclick = async ()=>{ 
    const id = b.dataset.remove; 
    // Optimistic UI: Hapus elemen langsung
    b.closest('.cart-item').style.opacity = '0.5';
    try {
        await sb.from('carts').delete().eq('id', id); 
        await loadCart(); // Muat ulang untuk sinkronisasi
        toast('Item dihapus'); 
    } catch (err) {
        toast('Gagal menghapus item');
        b.closest('.cart-item').style.opacity = '1';
        console.error('delete cart item', err);
    }
  }); 
} 

// ---------- Withdraw (penarikan) ---------- 
async function requestWithdraw(){ 
  if(!currentUser) return alert('Login dulu'); 
  const rawAmount = Number($('#withdraw-amount').value) || 0; 
  if(rawAmount <= 0) return $('#withdraw-note').textContent = 'Masukkan jumlah yang valid.'; 
  
  let method = $('#withdraw-method').value; 
  let dest = $('#withdraw-destination').value; 
  
  if(!method || !dest) return $('#withdraw-note').textContent = 'Rekening tujuan belum diatur. Silakan atur di halaman Profil.'; 

  const userBalance = (currentUser.user_metadata || {}).balance || 0;
  if (rawAmount > userBalance) return $('#withdraw-note').textContent = 'Saldo tidak mencukupi.';

  $('#withdraw-note').textContent = 'Mengirim permintaan...'; 
  try{ 
    const payload = { 
      user_id: currentUser.id, 
      amount: rawAmount, 
      method: method, 
      destination: dest, 
      status: 'pending', 
      created_at: new Date().toISOString() 
    }; 
    const { data, error } = await sb.from('withdraw_requests').insert([payload]); 
    if(error) throw error; 

    const newBalance = userBalance - rawAmount;
    await sb.auth.updateUser({ data: { balance: newBalance } });
    currentUser.user_metadata.balance = newBalance;
    renderProfile(); 
    
    $('#withdraw-note').textContent = 'Permintaan penarikan terkirim. Saldo Anda telah dikurangi.'; 
    $('#withdraw-amount').value=''; 
    await loadWithdraws(); 
    toast('Permintaan penarikan terkirim'); 
  }catch(err){ 
    $('#withdraw-note').textContent = 'Gagal mengirim: '+err.message; 
    console.error('requestWithdraw', err); 
  } 
} 

async function loadWithdraws(){ 
  if(!currentUser) return; 
  $('#withdraw-list').innerHTML = '<div class="small">Memuat riwayat...</div>'; 
  try{ 
    const { data, error } = await sb.from('withdraw_requests').select('*').eq('user_id', currentUser.id).order('created_at',{ascending:false}).limit(50); 
    if(error) throw error; 
    if(!data || !data.length) { 
      $('#withdraw-list').innerHTML = '<div class="small">Belum ada permintaan penarikan.</div>'; 
      return; 
    } 
    $('#withdraw-list').innerHTML = ''; 
    data.forEach(r=>{ 
      const div = document.createElement('div'); 
      div.className='small card'; 
      div.style.padding = '8px';
      div.style.boxShadow = 'none';
      div.style.marginBottom = '6px';
      div.innerHTML = `<strong>${fmt(r.amount)}</strong> (${r.method}) - Tujuan: ${escapeHTML(r.destination)}<br>Status: <span style="font-weight:700; color:${r.status==='completed'?'#059669':'#f97316'}">${r.status}</span> • ${new Date(r.created_at).toLocaleDateString('id-ID')}`;
      $('#withdraw-list').appendChild(div);
    });
  }catch(err){ 
      $('#withdraw-list').innerHTML = '<div class="small">Gagal memuat riwayat: '+err.message+'</div>';
      console.error('loadWithdraws', err);
  }
}

// ---------- Account Management ----------
function populateAccountNames(type){
  const select = document.getElementById('account-name');
  select.innerHTML = '';
  const names = type === 'bank' ? ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga'] : ['GoPay', 'OVO', 'Dana', 'ShopeePay'];
  names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
  });
}

async function saveAccount(){ 
  if(!currentUser) return alert('Silakan login dulu'); 
  const type = document.getElementById('account-type').value; 
  const name = document.getElementById('account-name').value; 
  const number = document.getElementById('account-number').value.trim(); 
  if(!type || !name || !number) return document.getElementById('save-account-note').textContent = 'Semua field harus diisi.';
  
  document.getElementById('save-account-note').textContent = 'Menyimpan...'; 
  try{ 
      const { data, error } = await sb.auth.updateUser({ 
          data: { 
              account_type: type, 
              account_name: name,
              account_number: number 
          }}); 
      if(error) throw error; 
      
      currentUser = data.user || data; 
      populateAccountDetails();
      document.getElementById('save-account-note').textContent = 'Rekening tersimpan.'; 
      toast('Rekening tersimpan'); 
  }catch(err){ 
      console.error('saveAccount', err); 
      document.getElementById('save-account-note').textContent = 'Gagal menyimpan: ' + (err.message || err); 
  } 
} 

async function clearAccount(){ 
  if(!currentUser) return alert('Silakan login dulu'); 
  if(!confirm('Hapus rekening tersimpan?')) return; 
  try{ 
      const { data, error } = await sb.auth.updateUser({ 
          data: { 
              account_type: null, 
              account_name: null, 
              account_number: null 
          }}); 
      if(error) throw error; 
      currentUser = data.user || data; 
      populateAccountDetails();
      document.getElementById('save-account-note').textContent = 'Rekening dihapus.'; 
      toast('Rekening dihapus'); 
  }catch(err){ 
      console.error('clearAccount', err); 
      document.getElementById('save-account-note').textContent = 'Gagal: ' + (err.message || err); 
  } 
} 
function populateAccountDetails() {
    if (!currentUser) return;

    // Ambil data dari user_metadata Supabase
    const meta = currentUser.user_metadata || {};
    const type = meta.account_type || '';
    const name = meta.account_name || '';
    const number = meta.account_number || '';

    // ==============================
    // 1) Isi ulang form di halaman Rekening
    // ==============================
    const typeSelect = document.getElementById('account-type');
    const nameSelect = document.getElementById('account-name');
    const numberInput = document.getElementById('account-number');

    if (type) {
        typeSelect.value = type;
        populateAccountNames(type);   // isi dropdown nama bank/e-wallet
        nameSelect.value = name || '';
        numberInput.value = number || '';
    } else {
        // Jika belum ada rekening
        typeSelect.value = "bank";
        populateAccountNames("bank");
        nameSelect.value = "";
        numberInput.value = "";
    }

    // ==============================
    // 2) Update halaman Finance → Withdraw
    // ==============================
    const withdrawMethod = document.getElementById('withdraw-method');
    const withdrawDest = document.getElementById('withdraw-destination');

    if (type && name && number) {
        withdrawMethod.value = type === 'bank' ? 'Bank' : 'E-Wallet';
        withdrawDest.value = `${name} • ${number}`;
    } else {
        withdrawMethod.value = '';
        withdrawDest.value = '';
    }
}
document.getElementById('account-type').addEventListener('change', e => {
    populateAccountNames(e.target.value);
});


// ---------- Events & init ---------- (async () => {
document.addEventListener('DOMContentLoaded', async () => {
  // 🔹 Cek session aktif saat halaman dimuat
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) {
      console.error('Gagal cek session:', error.message);
      showPage('auth');
    } else if (data && data.session) {
      console.log('Session aktif:', data.session);
      showPage('home');
    } else {
      showPage('auth');
    }
  } catch (err) {
    console.error('Error saat cek session:', err);
    showPage('auth');
  }

  // 🔹 Listener perubahan status login
  sb.auth.onAuthStateChange((event, currentSession) => {
    if (currentSession) showPage('home');
    else showPage('auth');
  });

  // 🔹 Tombol navigasi auth
  $('#btn-show-register').onclick = () => showPage('register');
  $('#btn-show-login').onclick = () => showPage('auth');

  // 🔹 Tombol login
  $('#btn-login').onclick = async () => {
    const email = $('#auth-email').value.trim();
    const password = $('#auth-pass').value.trim();
    if (!email || !password) {
      $('#auth-note').textContent = 'Email dan password wajib diisi.';
      return;
    }

    $('#auth-note').textContent = 'Memproses login...';

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      $('#auth-note').textContent = 'Login berhasil 🎉';
      showPage('home');
    } catch (err) {
      console.error(err);
      $('#auth-note').textContent = 'Gagal login: ' + err.message;
    }
  };


   $('#btn-register').onclick = async () => {
      const name = $('#reg-name').value.trim();
      const email = $('#reg-email').value.trim();
      const password = $('#reg-pass').value.trim();
      if (!name || !email || !password || password.length < 6) return $('#reg-note').textContent = 'Nama, email, dan password (min 6 karakter) wajib diisi.';
      $('#reg-note').textContent = 'Memproses pendaftaran...';
      try {
          const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, balance: 0 } } });
          if (error) throw error;
          $('#reg-note').textContent = 'Berhasil daftar . Silakan login.';
          setTimeout(() => showPage('auth'), 1500);
      } catch (err) {
          $('#reg-note').textContent = 'Gagal daftar: ' + (err.message || err);
      }
  };
  $('#btn-google').onclick = async () => { 
    try { 
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google' }); 
      if (error) throw error; 
    } catch (err) { 
      $('#auth-note').textContent = 'Google login error: ' + (err.message || err); 
    } 
  }; 
    // Cari blok ini (atau tempat Anda menaruh event listener)
  $('#btn-send-chat-detail').onclick = sendChatMessage;
  $('#chat-detail-input').addEventListener('keypress', e => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  // ✅ TAMBAHKAN BLOK KODE INI KE script.js (DI DALAM DOMContentLoaded)

// --- Logika Swipe-to-Delete ---
let touchStartX = 0;
let touchCurrentX = 0;
let swipeThreshold = -50; // Jarak minimal geser (px)
let activeSwipeItem = null;

function getEventX(e) {
  return e.touches ? e.touches[0].clientX : e.clientX;
}

function onSwipeStart(e) {
  // Jangan geser jika yang diklik adalah tombol
  if (e.target.tagName === 'BUTTON') return;

  const item = e.target.closest('.chat-list-item');
  if (!item) return;

  // Tutup item lain yang mungkin terbuka
  if (activeSwipeItem && activeSwipeItem !== item) {
    activeSwipeItem.classList.remove('swiped');
  }

  touchStartX = getEventX(e);
  touchCurrentX = touchStartX;
  activeSwipeItem = item;

  // Matikan transisi saat sedang di-drag
  activeSwipeItem.style.transition = 'none';
}

function onSwipeMove(e) {
  if (!activeSwipeItem) return;

  touchCurrentX = getEventX(e);
  let diffX = touchCurrentX - touchStartX;

  // Hanya izinkan geser ke kiri
  if (diffX > 0) diffX = 0; 
  // Batasi jarak geser
  if (diffX < -110) diffX = -110; 

  activeSwipeItem.style.transform = `translateX(${diffX}px)`;
}

function onSwipeEnd(e) {
  if (!activeSwipeItem) return;

  // Nyalakan lagi transisi untuk animasi 'snap'
  activeSwipeItem.style.transition = 'transform 0.3s ease';

  let diffX = touchCurrentX - touchStartX;

  if (diffX < swipeThreshold) {
    // Jika geser cukup jauh, 'snap' terbuka
    activeSwipeItem.style.transform = 'translateX(-100px)';
    activeSwipeItem.classList.add('swiped');
  } else {
    // Jika tidak, 'snap' tertutup
    activeSwipeItem.style.transform = 'translateX(0px)';
    activeSwipeItem.classList.remove('swiped');
    activeSwipeItem = null;
  }
}

// Pasang listener ke KONTAINER chat
const chatListContainer = $('#chat-list-container');
if (chatListContainer) {
  // Untuk HP (Layar Sentuh)
  chatListContainer.addEventListener('touchstart', onSwipeStart, { passive: true });
  chatListContainer.addEventListener('touchmove', onSwipeMove, { passive: true });
  chatListContainer.addEventListener('touchend', onSwipeEnd);

  // Untuk Desktop (Mouse)
  chatListContainer.addEventListener('mousedown', onSwipeStart);
  chatListContainer.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) onSwipeMove(e); // Hanya jika mouse ditahan
  });
  chatListContainer.addEventListener('mouseup', onSwipeEnd);
  chatListContainer.addEventListener('mouseleave', (e) => {
      // Batal geser jika mouse keluar area
      if (activeSwipeItem) {
          onSwipeEnd(e);
      }
  });
}
// --- Batas Logika Swipe-to-Delete ---



  
  $('#profile-avatar').addEventListener('click', () => { 
      if (currentUser) { 
          $('#avatar-upload-input').click(); 
      } else { 
          toast('Login untuk mengubah foto profil'); 
      } 
  }); 
  $('#avatar-upload-input').addEventListener('change', uploadAvatar); 
  
  $('#btn-toggle-balance').addEventListener('click', toggleBalanceVisibility);
  $('#help-modal').addEventListener('click', (e) => {
      if (e.target.id === 'help-modal') hideHelpModal();
  });

  const accTypeEl = document.getElementById('account-type'); 
  if(accTypeEl) accTypeEl.addEventListener('change', (e)=> populateAccountNames(e.target.value)); 
  const accNameEl = document.getElementById('account-name'); 
  if(accTypeEl && !accNameEl.children.length) populateAccountNames(accTypeEl.value || 'bank'); 
  const saveBtn = document.getElementById('btn-save-account'); 
  if(saveBtn) saveBtn.addEventListener('click', saveAccount); 
  const clearBtn = document.getElementById('btn-clear-account'); 
  if(clearBtn) clearBtn.addEventListener('click', clearAccount); 
  
  document.getElementById('year').textContent = new Date().getFullYear(); 
  
  // bottom nav click 
  $$('.nav-item').forEach(n => n.addEventListener('click', () => { 
      const p = n.dataset.page; 
      // if (p === 'cart') loadCart(); // Ini tidak perlu, sudah ditangani di showPage
      if (!currentUser && (p === 'profile' || p === 'chat' || p === 'my-shop' || p === 'finance' || p === 'upload-product' || p === 'bank-account' || p === 'cart')) { 
          return showPage('auth'); 
      } 
      showPage(p); 
  })); 
  
  $('#btn-tab-withdraw').onclick = () => showFinanceTab('withdraw');
  $('#btn-tab-affiliate').onclick = () => showFinanceTab('affiliate');
  $('#btn-copy-aff').onclick = ()=> copyAffiliateLink(); 
  $('#btn-request-withdraw').onclick = ()=> requestWithdraw(); 
  $('#btn-load-withdraws').onclick = ()=> { 
      loadWithdraws(); 
  }; 

  // Cart top button 
  $('#btn-cart-top').onclick = ()=> {
      if (!currentUser) return showPage('auth');
      showPage('cart');
  }; 

  $('#search-input').addEventListener('keypress', e => {
    if(e.key === 'Enter') loadHomeProducts($('#search-input').value.trim());
  });
  
  $('#btn-send-chat-detail').onclick = sendChatMessage;
  $('#chat-detail-input').addEventListener('keypress', e => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendChatMessage();
    }
  });
  
// Ganti fungsi submitProduct yang ada dengan ini

async function submitProduct() {
if (!currentUser) return toast('Login dulu');
const fileInput = document.getElementById('product-file');
const file = fileInput.files[0];
const title = document.getElementById('product-name').value;
const category = document.getElementById('product-category').value;
const price = parseFloat(document.getElementById('product-price').value);
const description = document.getElementById('product-description').value;
const uploadNoteEl = document.getElementById('upload-note');

if (!file || !title || !category || isNaN(price) || !description) {
  return toast('Semua kolom harus diisi dan harga harus valid.');
}

// Cek apakah ini file produk atau avatar.
// Ganti 'products' dengan nama bucket Storage Anda (misalnya: 'product-files')
const BUCKET_NAME = 'products'; 

uploadNoteEl.textContent = 'Mulai proses upload...';

try {
  const fileExtension = file.name.split('.').pop();
  
  // --- STRUKTUR PATH YANG BENAR UNTUK RLS ---
  // Format: [ID_USER]/[timestamp].[ext]
  const filename = `${currentUser.id}/${Date.now()}.${fileExtension}`;
  const filePath = filename; // Path yang disimpan di database
  // ------------------------------------------

  // ------------------------------------------
async function ensureConversation(buyer_id, seller_id, product_id) {
// Pastikan semua parameter diisi
if (!buyer_id || !seller_id || !product_id) {
  console.error("ensureConversation: parameter tidak lengkap", { buyer_id, seller_id, product_id });
  return null;
}

// 1️⃣ Cek apakah sudah ada percakapan
const { data: existing, error: errFind } = await sb
  .from("conversations")
  .select("id")
  .eq("buyer_id", buyer_id)
  .eq("seller_id", seller_id)
  .eq("product_id", product_id)
  .maybeSingle();

if (errFind) {
  console.error("Error mencari percakapan:", errFind);
  return null;
}

if (existing) {
  console.log("Percakapan sudah ada:", existing.id);
  return existing.id;
}

// 2️⃣ Jika belum ada, buat percakapan baru
const { data: created, error: errInsert } = await sb
  .from("conversations")
  .insert({ buyer_id, seller_id, product_id })
  .select("id")
  .single();

if (errInsert) {
  console.error("Gagal membuat percakapan:", errInsert);
  return null;
}

console.log("Percakapan baru dibuat:", created.id);
return created.id;
}

  // 1. Upload ke Supabase Storage (Menggunakan klien 'sb')
  uploadNoteEl.textContent = 'Mengupload file produk...';
  
  const { data: uploadData, error: uploadError } = await sb.storage
    .from(BUCKET_NAME)
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: true,
      metadata: { 
        owner: currentUser.id,
        product_title: title
      }
    });

  if (uploadError) throw uploadError;

  // 2. Simpan data produk ke database (Menggunakan path lengkap)
  uploadNoteEl.textContent = 'Menyimpan data produk...';

  const { data, error: insertError } = await sb.from('products').insert([{
    title,
    category,
    price,
    description,
    file_url: filePath, // Menggunakan path yang benar: 'products/user-id/filename.ext'
    seller_id: currentUser.id,
    created_at: new Date().toISOString()
  }]);

  if (insertError) throw insertError;

  toast('✅ Produk berhasil diupload!');
  // ... (reset formulir dan fungsi lainnya)
  // ...
  
} catch (err) {
  console.error('Upload error:', err);
  uploadNoteEl.textContent = '❌ Gagal upload: ' + (err.message || 'Terjadi kesalahan');
  toast('❌ Gagal upload: ' + (err.message || 'Terjadi kesalahan'));
}
}

document.getElementById('submit-product').addEventListener('click', submitProduct);

  $$('.nav-item').forEach(n => n.classList.remove('active')); 
  document.querySelector('.nav-item[data-page="home"]').classList.add('active'); 

  await initAuth(); 
  await loadCategories();

  const params = new URLSearchParams(location.search); 
  const ref = params.get('ref'); 
  const product = params.get('product'); 
  if(ref){ trackAffiliateClick(ref, product); }
});
// ---------- FUNGSI CHAT PRIVAT REALTIME (DIPERBARUI UI) ----------


// GANTI FUNGSI loadChatListPage YANG LAMA DENGAN INI:
// GANTI FUNGSI loadChatListPage YANG LAMA DENGAN INI:
async function loadChatListPage() {
    const container = document.getElementById('chat-list-container');
    const empty = document.getElementById('chat-list-empty');
    
    if (!currentUser) {
        container.innerHTML = '<div class="small" style="text-align:center;padding:12px;">Login untuk melihat percakapan.</div>';
        return;
    }
    
    container.innerHTML = '<div class="small" style="text-align:center;padding:12px;">Memuat percakapan...</div>';

    try {
        // 1. PERBAIKAN QUERY: Tambahkan buyer_id dan seller_id (raw ID) agar kita punya cadangan jika profile null
        const { data: convs, error } = await sb
            .from('conversations')
            .select(`
                id, 
                created_at,
                buyer_id, 
                seller_id,
                buyer:profiles!buyer_id(id, full_name, avatar_url),
                seller:profiles!seller_id(id, full_name, avatar_url)
            `)
            .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!convs || convs.length === 0) {
            container.innerHTML = '<div class="small" style="text-align:center; padding: 20px;">Belum ada percakapan</div>';
            if (empty) empty.style.display = 'block';
            return;
        }

        container.innerHTML = ''; 
        if (empty) empty.style.display = 'none';

        for (const conv of convs) {
            // 2. PERBAIKAN LOGIKA: Cek ID secara aman
            // Cek apakah saya adalah buyer berdasarkan ID mentah (lebih aman)
            const isMeBuyer = conv.buyer_id === currentUser.id;
            
            // Tentukan user lawan
            let otherUser = isMeBuyer ? conv.seller : conv.buyer;

            // 3. PERBAIKAN UTAMA: Menangani User Null (Terhapus)
            // Jika profile lawan tidak ditemukan (null), buat profile palsu agar tidak error
            if (!otherUser) {
                otherUser = {
                    id: isMeBuyer ? conv.seller_id : conv.buyer_id, // Gunakan ID mentah
                    full_name: 'Pengguna Terhapus', // Tampilkan teks ini
                    avatar_url: null
                };
                // Kita tidak lagi melakukan console.warn di sini
            }

            const otherUserName = otherUser.full_name || 'Pengguna';
            const avatarUrl = getAvatarUrl(otherUser.avatar_url);
            const fallbackSvg = createFallbackSvg(otherUserName, 48, 18);
            
            // PANGGIL FUNGSI SQL BARU UNTUK MENDAPATKAN HITUNGAN NYATA
            // Pastikan fungsi RPC 'get_unread_count' sudah dibuat di Supabase
            let unreadCount = 0;
            try {
                const { data: unreadCountResult } = await sb.rpc(
                    'get_unread_count',
                    { p_conversation_id: conv.id, p_user_id: currentUser.id }
                );
                unreadCount = unreadCountResult || 0;
            } catch (e) {
                console.log('Gagal ambil unread count (abaikan)', e);
            }
            
            // 1. Buat Wrapper (untuk Swipe-to-Delete)
            const wrapper = document.createElement('div');
            wrapper.className = 'chat-list-item-wrapper';

            // 2. Buat Item Chat (yang bisa digeser)
            const item = document.createElement('div');
            item.className = 'chat-list-item';
            item.dataset.convId = conv.id; 
            
            if (unreadCount > 0) {
                 item.classList.add('unread');
            }

            item.innerHTML = `
                <div class="avatar">
                    <img src="${avatarUrl}" alt="Avatar" onerror="this.onerror=null; this.src='${fallbackSvg}';"/>
                </div>
                <div class="chat-list-info">
                    <div class="chat-list-name">${escapeHTML(otherUserName)}</div>
                    <div class="chat-list-preview">
                        ${otherUser.full_name === 'Pengguna Terhapus' ? 'Akun ini tidak lagi tersedia.' : 'Klik untuk melihat detail percakapan...'}
                    </div>
                </div>
                <div class="chat-list-meta">
                    <span style="font-size:11px">
                        ${new Date(conv.created_at).toLocaleDateString('id-ID')}
                    </span>
                    <div class="unread-indicator" style="display: ${unreadCount > 0 ? 'block' : 'none'};"></div> 
                </div>
            `;

            // 3. Pindahkan OnClick ke item
            item.onclick = () => {
                if (item.classList.contains('swiped')) {
                    item.classList.remove('swiped');
                    return;
                }
                // Cegah membuka chat jika user sudah terhapus (opsional, atau biarkan terbuka untuk dilihat historynya)
                if (otherUser.full_name === 'Pengguna Terhapus') {
                    toast('Pengguna ini sudah tidak aktif.');
                    // Tetap izinkan buka chat untuk melihat history lama jika mau, 
                    // atau return di sini jika ingin melarang.
                    // startChatWithUser(otherUser.id); 
                } else {
                    startChatWithUser(otherUser.id); 
                }
            };
            
            // 4. Buat Tombol Aksi Hapus
            const action = document.createElement('div');
            action.className = 'chat-list-action';
            action.innerHTML = `<button class="btn-delete-chat">Hapus</button>`;
            
            // 5. Tambahkan listener ke tombol hapus
            action.querySelector('.btn-delete-chat').onclick = (e) => {
                e.stopPropagation(); 
                if (typeof deleteConversation === 'function') {
                    deleteConversation(conv.id, wrapper); 
                }
            };

            // 6. Susun elemen
            wrapper.appendChild(action); 
            wrapper.appendChild(item);   
            
            container.appendChild(wrapper); 
        }

    } catch (err) {
        console.error('loadChatListPage error:', err);
        container.innerHTML = `<div class="small" style="text-align:center; color: var(--danger);">Gagal memuat percakapan.</div>`;
    }
}

// 🔹 Fungsi untuk buka toko penjual
async function openSellerShop(sellerId) {
showPage('seller-shop');
currentSellerId = sellerId;

const nameEl = document.getElementById('seller-name');
const avatarEl = document.getElementById('seller-avatar');
const followersEl = document.getElementById('seller-followers');
const productsContainer = document.getElementById('seller-products');
const followBtn = document.getElementById('follow-seller-btn');

nameEl.textContent = 'Memuat...';
followersEl.textContent = '';
productsContainer.innerHTML = `<div class="small" style="text-align:center;">Memuat produk...</div>`;

try {
  // 🔸 Ambil profil penjual
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', sellerId)
    .maybeSingle();

  if (profileError || !profile) throw new Error('Profil penjual tidak ditemukan.');

  // 🔸 Tentukan URL foto profil
  // 🔹 Ambil foto profil dari Supabase Storage
let avatarUrl = 'https://via.placeholder.com/70?text=AV';
if (profile.avatar_url) {
try {
  const { data: publicUrl } = sb
    .storage
    .from('avatars') // pastikan nama bucket kamu di sini
    .getPublicUrl(profile.avatar_url);

  if (publicUrl?.publicUrl) {
    avatarUrl = publicUrl.publicUrl;
  }
} catch (e) {
  console.warn('Gagal memuat foto profil:', e);
}
}


  nameEl.textContent = profile.full_name || 'Penjual Tanpa Nama';
  avatarEl.innerHTML = `<img src="${avatarUrl}" alt="${profile.full_name}" 
    style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

  // 🔸 Hitung jumlah pengikut
  const { count: followersCount } = await sb
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId);
  followersEl.textContent = `${followersCount || 0} pengikut`;

  // 🔸 Status follow
  const { data: session } = await sb.auth.getSession();
  const userId = session?.session?.user?.id;

  if (!userId) {
    followBtn.disabled = true;
    followBtn.textContent = 'Login untuk Ikuti';
  } else {
    const { data: followCheck } = await sb
      .from('follows')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('follower_id', userId)
      .maybeSingle();

    if (followCheck) {
      followBtn.textContent = '✅ Mengikuti';
      followBtn.dataset.following = 'true';
      followBtn.style.background = '#6d28d9';
      followBtn.style.color = '#fff';
    } else {
      followBtn.textContent = '⭐ Ikuti';
      followBtn.dataset.following = 'false';
      followBtn.style.background = 'transparent';
      followBtn.style.color = '#6d28d9';
    }
  }

  // 🔸 Ambil produk dari penjual
  const { data: products, error: productError } = await sb
    .from('products')
    .select('id, title, price, file_url, image_url, created_at')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (productError) throw productError;

  if (!products?.length) {
    productsContainer.innerHTML = `<div class="small" style="text-align:center;">Belum ada produk dari toko ini.</div>`;
    return;
  }

  // 🔸 Render produk
  productsContainer.innerHTML = products.map(p => {
    //... (di dalam products.map)
    // Gunakan helper yang sama dengan halaman Home
    const imgUrl = getProductImageUrl(p.file_url || p.image_url); 
    const fallbackSvg = createFallbackSvg(p.title || '', 150, 40); // Buat SVG fallback
//...


    return `
      <div class="product-card card" 
           onclick="showProductDetail('${p.id}')"
           style="padding:8px; border-radius:8px;">
        <img src="${imgUrl}" 
             alt="${escapeHTML(p.title)}"
             onerror="this.src='https://via.placeholder.com/150?text=No+Image'"
             style="width:100%; border-radius:6px; height:120px; object-fit:cover;">
        <div style="font-weight:600; margin-top:4px;">${escapeHTML(p.title)}</div>
        <div style="color:var(--muted); font-size:13px;">Rp${Number(p.price || 0).toLocaleString('id-ID')}</div>
      </div>
    `;
  }).join('');

} catch (err) {
  console.error('❌ Gagal memuat toko:', err);
  productsContainer.innerHTML = `<div class="small" style="text-align:center;">${err.message}</div>`;
  nameEl.textContent = 'Gagal Memuat';
}
}

// 🔹 Fungsi Ikuti / Batal Ikuti
/**
 * Mengubah status follow (follow/unfollow) penjual.
 */

// 🔹 Fungsi Chat Penjual
async function openChatWithSeller() {
try {
  const { data: session } = await sb.auth.getSession();
  const userId = session?.session?.user?.id;
  if (!userId) return alert('Silakan login terlebih dahulu.');

  // ✅ Perbaikan di sini: parameter pakai p_other_user_id
  const { data: convo, error } = await sb.rpc('get_or_create_conversation', {
    p_other_user_id: currentSellerId
  });

  if (error) throw error;

  window.activeConversationId = convo.id;
  showPage('chat');
  await loadMessages(convo.id);
} catch (err) {
  console.error('Chat error:', err);
  alert('Gagal membuka chat dengan penjual.');
}
}


// 🔹 Helper aman HTML
function escapeHTML(str) {
return str?.replace(/[&<>'"]/g, t => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[t])) || '';
}

async function fixMissingAvatar(userId) {
try {
  // Ambil data profil
  const { data: profile, error } = await sb
    .from('profiles')
    .select('avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Gagal ambil profil:', error.message);
    return;
  }

  // Jika avatar_url null atau kosong
  if (!profile.avatar_url) {
    console.log('Avatar kosong, pakai placeholder sementara');
    document.querySelector('#seller-avatar img').src =
      'https://via.placeholder.com/80x80.png?text=No+Photo';
  } else {
    // Jika ada avatar, tampilkan
    document.querySelector('#seller-avatar img').src = profile.avatar_url;
  }
} catch (err) {
  console.error('Error fixMissingAvatar:', err);
}
}

function populateAffiliateLink() {
    if (!currentUser) {
        document.getElementById('affiliate-link').value = '';
        document.getElementById('affiliate-link').placeholder = 'Login untuk membuat link afiliasi';
        return;
    }

    // USER ID Supabase
    const uid = currentUser.id;

    // ==== Ganti ini dengan domainmu sendiri ====
    const domain = window.location.origin;
    // ===========================================

    const link = `${domain}/?ref=${uid}`;

    document.getElementById('affiliate-link').value = link;
}
document.getElementById('btn-copy-aff').addEventListener('click', () => {
    const input = document.getElementById('affiliate-link');
    if (!input.value) return toast('Tidak ada link untuk disalin');

    navigator.clipboard.writeText(input.value)
        .then(() => toast('Link afiliasi disalin'))
        .catch(() => toast('Gagal menyalin'));
});
sb.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;

    populateAccountDetails();
    populateAffiliateLink();
});
async function updateAvatarURL(url) {
    const { error } = await sb
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", currentUser.id);

    if (error) console.error(error);
}

async function loadUserProfile(userId) {
    const { data, error } = await sb
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();

    if (error) {
        console.error(error);
        return null;
    }

    return data;
}
async function showPublicProfile(userId) {
    const profile = await loadUserProfile(userId);
    if (!profile) return;

    // Render ke HTML
    document.getElementById("public-avatar").src = 
        profile.avatar_url || "default-avatar.png";

    document.getElementById("public-name").textContent = 
        profile.full_name || "Tidak ada nama";
}
async function loadAllMembers() {
    const { data, error } = await sb
        .from("profiles")
        .select("id, full_name, avatar_url");

    if (error) {
        console.error(error);
        return;
    }

    const list = document.getElementById("members-list");
    list.innerHTML = "";

    data.forEach(member => {
        const div = document.createElement("div");
        div.className = "member-item";
        div.innerHTML = `
            <img src="${member.avatar_url || 'default-avatar.png'}" class="avatar-sm" />
            <span>${member.full_name || 'Tanpa nama'}</span>
        `;
        list.appendChild(div);
    });
}
async function getCurrentUser() {
    const { data } = await sb.auth.getUser();
    currentUser = data.user || null;

    if (!currentUser) return;

    // Pastikan profil user ada
    await ensureProfileExists(currentUser.id);
}

async function ensureProfileExists(uid) {
    const { data, error } = await sb
        .from("profiles")
        .select("id")
        .eq("id", uid)
        .maybeSingle();

    // Jika sudah ada profil → selesai
    if (data) return;

    // Jika belum ada → buat profil baru
    const { error: err2 } = await sb
        .from("profiles")
        .insert({
            id: uid,
            name: "Pengguna Baru",
            avatar_url: null,
            created_at: new Date().toISOString()
        });

    if (err2) console.error("Gagal membuat profil:", err2);
}

async function openUserProfile(userId) {
    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (!data) {
        console.warn("Profil lawan bicara tidak ditemukan:", userId);
        return;
    }

    document.getElementById("public-avatar").src = data.avatar_url || "default.png";
    document.getElementById("public-name").textContent = data.name || "Pengguna";
}
/**
 * Mengubah status langganan (subscribe/unsubscribe) penjual.
 */
async function toggleStoreSubscription() {
    const user = await sb.auth.getUser(); // Menggunakan 'sb' klien Supabase Anda
    const btn = document.getElementById('follow-seller-btn'); // Menggunakan tombol 'follow' yang ada
    
    if (!user.data.user || !currentSellerId) {
        alert('Anda harus login atau ID penjual tidak ditemukan.');
        return;
    }
    
    const subscriberId = user.data.user.id;
    const isSubscribed = btn.textContent.toLowerCase().includes('berhenti');
    
    // Tampilkan status loading dan nonaktifkan tombol
    btn.textContent = 'Memproses...';
    btn.disabled = true;

    try {
        if (isSubscribed) {
            // Logika UN-SUBSCRIBE (Hapus data dari tabel)
            await sb
                .from('store_subscriptions')
                .delete()
                .eq('subscriber_id', subscriberId)
                .eq('seller_id', currentSellerId);

            btn.textContent = 'Berlangganan'; // Ubah teks tombol
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');

        } else {
            // Logika SUBSCRIBE (Masukkan data ke tabel)
            await sb
                .from('store_subscriptions')
                .insert([{ subscriber_id: subscriberId, seller_id: currentSellerId }]);

            btn.textContent = 'Berhenti Langganan'; // Ubah teks tombol
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-primary');
        }

        // Perbarui jumlah pelanggan di tampilan
        await updateSubscriberCount(currentSellerId);

    } catch (error) {
        console.error('Error saat proses langganan:', error);
        alert('Gagal, coba cek Policy Supabase Anda.');
        // Kembalikan teks tombol jika gagal
        btn.textContent = isSubscribed ? 'Berhenti Langganan' : 'Berlangganan'; 
    } finally {
        btn.disabled = false; // Aktifkan kembali tombol
    }
}
/**
 * Memeriksa status langganan saat halaman dimuat.
 */
async function checkIfUserSubscribed(sellerId) {
    const btn = document.getElementById('follow-seller-btn');
    const user = await sb.auth.getUser();
    
    // --- RESET DAN AKTIFKAN TOMBOL ---
    btn.disabled = false; 
    btn.style.display = 'block';
    btn.textContent = 'Berlangganan';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');

    if (!user.data.user) {
        btn.textContent = 'Berlangganan (Login dulu)';
        return;
    }
    if (user.data.user.id === sellerId) {
        btn.style.display = 'none'; // Sembunyikan jika toko sendiri
        return;
    }

    // Cek Status Langganan di Database
    const { data } = await sb
        .from('store_subscriptions')
        .select('*')
        .eq('subscriber_id', user.data.user.id)
        .eq('seller_id', sellerId)
        .limit(1);

    if (data && data.length > 0) {
        // Sudah berlangganan
        btn.textContent = 'Berhenti Langganan';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
    }
}

/**
 * Mengambil dan memperbarui jumlah pelanggan.
 */
async function updateSubscriberCount(sellerId) {
    // Gunakan ID elemen follower yang sudah ada
    const subscriberEl = document.getElementById('seller-followers'); 
    if (!sellerId) return;

    try {
        // Memanggil fungsi SQL yang baru
        const { data } = await sb.rpc('get_store_subscriber_count', { seller_uuid: sellerId });
        const count = data || 0;
        subscriberEl.textContent = `${count} pelanggan`; // Ubah teks dari 'pengikut' menjadi 'pelanggan'
    } catch (error) {
        console.error('Gagal mengambil jumlah pelanggan:', error);
        subscriberEl.textContent = 'Error memuat pelanggan';
    }
}

// --- PERBAIKAN FUNGSI deleteConversation ---
async function deleteConversation(convId, listItemElement) {
    if (!currentUser) return toast('Login dulu');

    if (!confirm('Yakin ingin menghapus percakapan ini? Semua pesan akan terhapus permanen.')) {
        return;
    }

    toast('Menghapus percakapan...');
    listItemElement.style.opacity = '0.5';

    try {
        // 1. Hapus SEMUA pesan yang terkait dari tabel 'messages' (Ini yang sudah Anda lakukan)
        const { error: msgError } = await sb
            .from('messages')
            .delete()
            .eq('conversation_id', convId);
        
        if (msgError) throw new Error('Gagal menghapus pesan: ' + msgError.message);


        // 2. [LANGKAH BARU] Hapus baris dari tabel 'conversations' (Jika Anda memilikinya)
        const { error: convError } = await sb
            .from('conversations') // GANTI 'conversations' dengan nama tabel yang benar
            .delete()
            .eq('id', convId); // Diasumsikan kolom ID di tabel ini bernama 'id'

        if (convError) throw new Error('Gagal menghapus percakapan induk: ' + convError.message);


        // 3. Hapus elemen percakapan dari UI (hanya jika sukses di database)
        listItemElement.remove();
        toast('✅ Percakapan berhasil dihapus permanen.');
        loadChatListPage(); 

    } catch (err) {
        console.error('deleteConversation error:', err);
        toast('❌ Gagal menghapus: ' + (err.message || 'Terjadi kesalahan. Cek RLS!'));
        listItemElement.style.opacity = '1';
    }
}
// --- Fungsi Notifikasi ---

/**
 * Mengambil dan menampilkan notifikasi dari Supabase.
 * @param {string} filter - Filter jenis notifikasi ('all', 'new', 'transaction', 'info').
 */
async function loadNotifications(filter = currentNotifFilter) {
    if (!currentUser) {
        return toast('Login dulu untuk melihat notifikasi!');
    }

    const notifListEl = $('#notification-list');
    const loadingEl = $('#notif-loading');
    const emptyStateEl = $('#empty-notification-state');
    
    if(!notifListEl || !loadingEl || !emptyStateEl) return; // Pengaman jika elemen belum ada

    loadingEl.style.display = 'block';
    notifListEl.innerHTML = '';
    emptyStateEl.style.display = 'none';

    currentNotifFilter = filter;

    try {
        let query = sb
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        // Terapkan filter tambahan
        if (filter === 'new') {
            query = query.eq('is_read', false);
        } else if (filter !== 'all') {
            // Filter berdasarkan jenis jika bukan 'all' atau 'new'
            query = query.eq('type', filter);
        }

        const { data: notifications, error } = await query;

        if (error) throw new Error('Gagal memuat notifikasi: ' + error.message);

        loadingEl.style.display = 'none';
        
        if (notifications.length === 0) {
            emptyStateEl.style.display = 'flex';
            return;
        }

        notifications.forEach(notif => {
            notifListEl.appendChild(createNotificationItem(notif));
        });

    } catch (err) {
        console.error('loadNotifications error:', err);
        loadingEl.style.display = 'none';
        notifListEl.innerHTML = '<p class="text-center danger small">❌ Gagal memuat notifikasi.</p>';
        toast('❌ Gagal memuat: ' + (err.message || 'Terjadi kesalahan.'));
    }

    // Perbarui hitungan badge notifikasi
    updateUnreadCount();
}


/**
 * Membuat elemen HTML untuk satu item notifikasi.
 * @param {object} notif - Objek notifikasi dari Supabase.
 */
function createNotificationItem(notif) {
    const item = document.createElement('div');
    const isUnread = !notif.is_read;
    const timeAgo = timeSince(new Date(notif.created_at));

    // Menentukan ikon berdasarkan tipe
    let icon = '🎁'; // default
    if (notif.type === 'transaction') {
        icon = '🛍️';
    } else if (notif.type === 'info') {
        icon = '📰';
    } else if (notif.type === 'system') {
        icon = '⚙️';
    }

    item.classList.add('notification-item');
    if (isUnread) {
        item.classList.add('unread');
    }

    item.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div style="flex:1;">
            <div class="notification-title">${escapeHTML(notif.title)} ${isUnread ? '<span class="badge" style="background:var(--danger);font-size:10px;margin-left:5px;">BARU</span>' : ''}</div>
            <p class="notification-body">${escapeHTML(notif.body)}</p>
            <p class="notification-time">${timeAgo}</p>
        </div>
    `;

    item.addEventListener('click', () => handleNotificationClick(notif.id, notif.link));

    return item;
}

/**
 * Menangani klik pada notifikasi.
 * @param {string} notifId - ID notifikasi yang diklik.
 * @param {string|null} link - Link yang akan dibuka.
 */
async function handleNotificationClick(notifId, link) {
    // 1. Tandai sudah dibaca di database
    await sb.from('notifications').update({ is_read: true }).eq('id', notifId);

    // 2. Muat ulang notifikasi atau hapus kelas 'unread'
    loadNotifications(currentNotifFilter);
    updateUnreadCount();

    // 3. Arahkan ke link (jika ada)
    if (link) {
        if (link.startsWith('product:')) {
            const productId = link.split(':')[1];
            // Asumsi: showProductDetail(productId) sudah ada
            showProductDetail(productId); 
            toast(`Mengarahkan ke Produk...`);
        } else if (link.startsWith('order:')) {
            const orderId = link.split(':')[1];
            // showOrderDetail(orderId); // Anda perlu membuat fungsi ini
            toast(`Mengarahkan ke Detail Pesanan ID: ${orderId}`);
        } else {
            window.open(link, '_blank');
        }
    }
}

/**
 * Mengambil hitungan notifikasi yang belum dibaca dan memperbarui badge.
 */
async function updateUnreadCount() {
    // Gunakan id 'unread-notif-count' yang baru kita set
    const badgeEl = $('#unread-notif-count'); 
    if (!currentUser || !badgeEl) return;

    try {
        const { count, error } = await sb
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);

        if (error) throw error;
        
        if (count && count > 0) {
            badgeEl.textContent = count > 99 ? '99+' : count;
            badgeEl.style.display = 'inline-block';
        } else {
            badgeEl.style.display = 'none';
        }

    } catch (err) {
        console.error('updateUnreadCount error:', err);
        // Biarkan badge tersembunyi jika ada error
        if(badgeEl) badgeEl.style.display = 'none'; 
    }
}

/**
 * Menandai semua notifikasi pengguna saat ini sebagai sudah dibaca.
 */
async function markAllAsRead() {
    if (!currentUser) return;
    
    if (!confirm('Yakin ingin menandai semua notifikasi sebagai sudah dibaca?')) return;

    toast('Memperbarui notifikasi...');
    
    try {
        const { error } = await sb
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false); 

        if (error) throw error;

        toast('✅ Semua notifikasi telah ditandai sudah dibaca.');
        loadNotifications(currentNotifFilter); 
        updateUnreadCount(); 

    } catch (err) {
        console.error('markAllAsRead error:', err);
        toast('❌ Gagal menandai sudah dibaca: ' + (err.message || 'Terjadi kesalahan.'));
    }
}

// Fungsi timeSince (untuk menampilkan "2 jam lalu", dll.)
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) { return Math.floor(interval) + " tahun lalu"; }
    interval = seconds / 2592000;
    if (interval > 1) { return Math.floor(interval) + " bulan lalu"; }
    interval = seconds / 86400;
    if (interval > 1) { return Math.floor(interval) + " hari lalu"; }
    interval = seconds / 3600;
    if (interval > 1) { return Math.floor(interval) + " jam lalu"; }
    interval = seconds / 60;
    if (interval > 1) { return Math.floor(interval) + " menit lalu"; }
    return "baru saja";
}

// --- PENTING: Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // ... kode DOMContentLoaded yang sudah ada ...

    // START: BARIS BARU UNTUK LISTENER TAB NOTIFIKASI
    const tabsNav = $('#notification-tabs');
    if (tabsNav) {
        tabsNav.addEventListener('click', (event) => {
            const btn = event.target.closest('.tab-button');
            if (btn) {
                const filter = btn.dataset.filter;
                // Hapus kelas 'active' dari semua tombol
                $$('.tab-button', tabsNav).forEach(b => b.classList.remove('active'));
                // Tambahkan kelas 'active' ke tombol yang diklik
                btn.classList.add('active');
                
                loadNotifications(filter);
            }
        });
    }
    // END: BARIS BARU UNTUK LISTENER TAB NOTIFIKASI

    // ... sisa kode DOMContentLoaded ...

    // Panggil updateUnreadCount() setelah aplikasi dimuat/login
    // Anda bisa memanggilnya di sini, tapi LEBIH BAIK setelah status login terverifikasi.
    // Misalnya, di dalam fungsi inisialisasi atau fungsi 'checkLoginStatus' Anda.
    
    // updateUnreadCount(); 
});




// ( ... sisa fungsi Anda ... )
