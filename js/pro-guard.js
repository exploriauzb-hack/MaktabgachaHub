/* pro-guard.js — PRO sahifalarni himoyalaydi (js/ papkasiga qo'ying)

   Har bir PRO sahifaga 2 ta o'zgartirish:

   1) <head> ichiga:
      <style id="pg-hide">html{visibility:hidden}</style>

   2) </body> dan oldin, OXIRGI <script> dan keyin (sahifada bular bo'lmasa qo'shing):
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      <script src="../js/supabase.js"></script>
      <script src="../js/auth.js"></script>
      <script src="../js/pro-guard.js"></script>

   Natija: tizimga kirmagan yoki PRO bo'lmagan foydalanuvchi sahifani ko'rmaydi,
   premium sahifasiga yo'naltiriladi. Admin va PRO/Korporativ foydalanuvchilar kiradi. */
(function(){
  var show=function(){var s=document.getElementById('pg-hide');if(s)s.remove();document.documentElement.style.visibility='';};
  var deny=function(){location.replace('../premium.html');};
  var run=async function(){
    try{
      if(typeof initAuth!=='function'||typeof isPro!=='function')return deny();
      var a=await initAuth(true);
      if(!a)return deny();
      if(isPro()||(typeof isCorporate==='function'&&isCorporate()))return show();
      try{
        var r=await _sb.rpc('is_admin');
        if(r&&r.data===true)return show();
      }catch(e){}
      deny();
    }catch(e){console.warn('pro-guard:',e);deny();}
  };
  if(document.readyState==='complete')run();else window.addEventListener('load',run);
})();
