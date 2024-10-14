document.addEventListener('DOMContentLoaded', () => {
    let btn = document.querySelector(".near-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const { latitude, longitude } = position.coords;
                    const data = {
                        latitude: latitude,
                        longitude: longitude
                    }
                    fetch("/find", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.listings.length > 0) {
                                console.log(data.listings);
                                let success = document.querySelector(".container #success");
                                success.textContent = "Hotels found near you!";
                                success.style.display = 'block';
                                setTimeout(() => {
                                    success.style.display = 'none';
                                }, 3000);
                                displayListings(data.listings, data.gstPrice);
                            }
                            else {
                                let err = document.querySelector(".container #error");
                                err.textContent = "No Hotels near you :(";
                                err.style.display = 'block';
                                setTimeout(() => {
                                    err.style.display = 'none';
                                }, 3000);
                            }
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                        });
                },
                    (err) => {
                        console.log(err);
                    }
                )
            }
        })
    }
});
function displayListings(listings, gstPrice) {
    let divs = document.querySelectorAll(".card");
    divs.forEach(div => {
        div.innerHTML = "";
    });
    let containerDiv = document.querySelector(".container .row");
    containerDiv.innerHTML = "";
    let i = 0;
    listings.forEach(listing => {
        const listingCard = `
        <a href="/listings/${listing._id}" class="icon-link icon-link-hover listing-link">
            <div class="card col listing-card">
                <img src="${listing.image.url}" class="card-img-top" alt="img" style="height: 15rem;">
                <div class="card-img-overlay">
                </div>
                <div class="card-body">
                    <h5 class="card-title">${listing.title}</h5>
                    <p class="card-text">
                <span class="without-gst">&#8377;${listing.price} /night
                <i>&nbsp; &nbsp;+18% GST</i></span>
                <span class="with-gst">&#8377;${gstPrice[i]} /night</span>
              </p>
                </div>
            </div></a>`;

        containerDiv.insertAdjacentHTML("afterbegin", listingCard);
        i++;
    });
}