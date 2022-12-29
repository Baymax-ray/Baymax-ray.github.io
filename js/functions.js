function sendEmail() {
    Email.send({
        Host : "smtp.elasticemail.com",
        Username : "RayF.contact@gmail.com",
        Password : "1FB9093F5EF6112B829730DEA50710B8465A",
        To : 'RayF.contact@gmail.com',
        From : 'RayF.contact@gmail.com',
        Subject : "(personal website) Contact from " + document.getElementById("name").value,
        Body : "Name: " + document.getElementById("name").value + "<br>" + 
        "Email: " + document.getElementById("email").value + "<br>" + 
        "Message: " + document.getElementById("message").value
    }).then(message => alert(message)
    );
    }