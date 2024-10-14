let taxSwitch = document.getElementById("flexSwitchCheckDefault");
taxSwitch.addEventListener("click", () => {
    let withGSTPrices = document.getElementsByClassName("with-gst");
    let withoutGSTPrices = document.getElementsByClassName("without-gst");
    for (let i = 0; i < withGSTPrices.length; i++) {
        if (withGSTPrices[i].style.display === "inline") {
            withGSTPrices[i].style.display = "none";
            withoutGSTPrices[i].style.display = "inline";
        } else {
            withGSTPrices[i].style.display = "inline";
            withoutGSTPrices[i].style.display = "none";
        }
    }
});