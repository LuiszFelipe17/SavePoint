let loginbtn = document.querySelectorAll(".mjmppzazl");
let regbtn = document.querySelectorAll(".vddwxrhku");
loginbtn.forEach(lel => {
    lel.addEventListener("click", function(){
        window.location.href = "login";
    })
});
regbtn.forEach(rel => {
    rel.addEventListener("click", function(){
        window.location.href = "register";
    })
});


