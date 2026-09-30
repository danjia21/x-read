---
title: "Apple Reference Image: Sensor-to-JPEG Attestation, Privacy, and Trust Boundaries (Annotated)"
source_title: "Apple Reference Image: A New Approach for Verified Photography"
source_url: "https://security.apple.com/blog/apple-reference-image/"
source_language: "en"
entry_language: "en"
published: "2026-09-15"
read_date: "2026-09-30"
authors:
  - "Apple Security Engineering and Architecture (SEAR)"
  - "Camera & Photos"
topics:
  - "Media Provenance"
  - "Applied Cryptography"
  - "Privacy-Preserving Computing"
tags:
  - "image-authenticity"
  - "camera-attestation"
  - "private-cloud-compute"
  - "post-quantum-signatures"
  - "secure-timestamps"
  - "revocation"
---

# Apple Reference Image: A New Approach for Verified Photography

> [!NOTE]
> **Guide | Reading route**
>
> Background: Content provenance and scene truth are different guarantees. C2PA records signed claims and edit history, while capture attestation tries to bind media to trusted sensor and processing states; neither alone proves that the photographed event was staged honestly or interpreted correctly.
>
> Apple Reference Image proposes a sensor-to-JPEG attestation chain for proving that a file came from a real iPhone sensor at a particular time, while trying to avoid persistent photographer identity. Track four layers: secure sensor capture, computational-photography integrity, Private Cloud Compute processing, and timestamp/revocation verification. Read the threat model and guarantee first, then the protocol flow, and finally the privacy and recovery mechanisms. Standard cryptographic components and PCC design are inspectable to varying degrees, but unreleased sensor behavior, hidden model weights, service operation, and the claim that even Apple cannot observe data remain vendor assertions. Keep one question in view: which parts of the guarantee are cryptographically verifiable by an outsider, and which still require institutional trust in Apple?

> [!NOTE]
> **Reading note | Source and evidence boundary**
>
> This entry preserves the complete substantive article as published by Apple and retrieved on 2026-09-30, excluding navigation and sharing controls. Architectural statements about unreleased custom sensor behavior, Apple-operated services, the hidden-weight confidence model, and implementation details are vendor claims unless independently inspectable artifacts or specifications are linked. The annotations distinguish cryptographically verifiable properties from institutional trust and operational assumptions. [Original article](https://security.apple.com/blog/apple-reference-image/)

Today, powerful, widely available AI tools allow users to easily generate or alter photorealistic images to a degree that was difficult to imagine just a few years ago. These tools enable helpful features, like one-touch removal of background distractions, but they also make it difficult to distinguish between photographs that depict real events, and synthetic images that are heavily altered or entirely generated. So, in the case where the essential role of a photograph is to prove that something actually happened, an image appearing photorealistic is no longer sufficient to establish its veracity.

This is not a simple problem to address. Modern cameras rely on sophisticated image-processing algorithms to produce the final viewable image, so certifying that an image accurately reflects what a real camera sensor captured requires a chain of trust covering the sensor as well as the computational photography software that interpreted the capture. Industry approaches to this problem, based on the C2PA standard, attach provenance metadata **after** capture and certify the history of image edits from that point forward. This approach, however, is vulnerable to compromise at any point in the editing chain, and a viewer has no way to detect such a failure. It can also create privacy risks for photographers working in dangerous conditions by tying the image to a public identity, either to a particular device or to an individual.

> [!NOTE]
> **Annotation | What is being contrasted with C2PA**
>
> The comparison compresses a broader design space. C2PA specifies signed assertions, content bindings, validation, timestamps, and revocation; it does not itself require that signing begin only after software processing, nor does it claim that valid provenance proves a scene is true. Its trust model explicitly treats provenance as a set of signals whose signer and assertions a consumer evaluates. Apple Reference Image can therefore be read as a specialized capture-attestation system that may complement, rather than categorically replace, C2PA. [C2PA 2.2 specification](https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html)

iPhone is the world’s most popular camera and the most secure consumer mobile device, and as such Apple is uniquely positioned to take on this challenge. The iPhone camera is integrated into a platform that sets the industry’s highest standards of security from the silicon up. We also operate Private Cloud Compute (PCC), an industry-leading privacy-preserving cloud infrastructure that is secure, auditable, and can perform verifiable algorithmic operations without allowing anyone — even Apple — the ability to see the data being processed. 

Leveraging these state-of-the-art capabilities, we have created **Apple Reference Image**, a novel solution for verifiable photography on iPhone, and debuting on the main camera sensor of iPhone 18 Pro and iPhone 18 Pro Max. This new, opt-in camera mode lets a photographer create a securely timestamped reference image that accurately reflects what was captured by the iPhone's camera sensor. Dedicated secure hardware on the device protects the integrity of this reference image, and Private Cloud Compute protects the privacy of the image data during processing. The system is built to be resilient to compromise, no matter how unlikely: any fraudulent images can be revoked without exposing the photographer's identity. 

Apple Reference Image offers a trustworthy, scalable guarantee that a reference image is what it claims to be: a real photograph, captured by a real sensor in an iPhone camera, at a specific time. It sets a new standard for verifiable digital photography. 

> [!NOTE]
> **Annotation | Precise scope of the guarantee**
>
> The claimed guarantee is sensor provenance plus a bounded capture time and a specific, attested development pipeline. It does not establish the depicted event’s wider context, location, photographer, intent, or absence of physical staging and optical spoofing. “Real photograph” is therefore narrower than “true account of an event.”

### The Core Requirements of Apple Reference Image

A high-assurance photographic provenance system must meet three core requirements:

* **Semantic authenticity**: a reference image must faithfully show what the sensor captured. Transformations of image data from the raw captured pixels to the final viewable image must be publicly verifiable.
* **Resilience to compromise**: image authenticity cannot be undermined by tampering with the camera sensor, through common cryptographic attacks, or via software-level jailbreak of the device. If, despite these protections, any fraudulent reference images are created, they can be revoked.
* **Privacy preservation**: an outside observer cannot determine whether any pair of reference images were taken by the same device. Image contents are not exposed to Apple or anyone else.

Apple Reference Image leverages custom-designed image sensors in iPhone 18 Pro and iPhone 18 Pro Max to ensure reliable capture of image data, and relies on Private Cloud Compute, which provides a computational environment for secure photographic processing that cannot be subverted even in the case of device compromise. We believe no other commercially-available photographic provenance system meets these strict requirements.

> [!NOTE]
> **Annotation | Three separable security properties**
>
> These requirements are useful because they prevent a single signature check from standing in for the whole system. Semantic authenticity concerns the sensor-to-render transformation; compromise resilience concerns keys, hardware, software, and recovery; privacy concerns unlinkability and confidentiality. The last sentence is a vendor superiority claim, not a comparative evaluation backed here by a published benchmark or formal security proof.

### Semantic Authenticity

For any photographic authenticity system, the defining goal is that a user can trust that what is shown as the authenticated image corresponds to the scene that was actually photographed. A central challenge these systems face is how to secure the extensive photographic processing pipeline of a modern computational camera. Simply signing the raw values emitted by a sensor does not yield a viewable image: these pixels still need significant processing, like [demosaicing](https://en.wikipedia.org/wiki/Demosaicing) and lens-shading correction, to be usable. To solve this, prior industry systems have delayed signing images until they reach the end of their software processing pipeline. But this approach is vulnerable to attacks that inject spoofed pixel data onto the data transport from the sensor, or to compromises of the device operating system that can completely alter the image before signing. Neither signing raw sensor values, nor delaying signing until the photograph is processed, meets our bar for semantic authenticity. Our solution hinges on splitting the Apple Reference Image process into two phases: creating a secure digital negative, and developing that negative into a reference image. Each phase receives our strongest protections. 

The creation of a secure digital negative begins with a secure boot of the camera sensor into a specialized reference capture mode. The mode instructs the sensor to cryptographically sign pixel data immediately after capture, and prevents the sensor firmware from modifying the data. This creates a hardware-enforced assurance that the operating system receives pixel data exactly as the hardware sensor captured it, preventing injection or tampering attacks. 

We treat image metadata with the same level of protection. Sensor-produced metadata is signed at capture time together with the pixel data. For the few metadata values that originate beyond the camera sensor, such as digital zoom boundaries and focal length, we use the Secure Enclave Processor (SEP) to sign the values. This off-sensor metadata cannot alter the pixel values themselves. 

> [!NOTE]
> **Annotation | The key architectural move**
>
> The system signs at the earliest trusted digital boundary, then moves image development into an attestable environment. This closes two different gaps: unsigned sensor-bus data before device-side signing, and opaque or compromised operating-system processing after capture. The remaining root assumptions include genuine sensor hardware, correct immutable/secure-boot code, protected sensor and SEP keys, trustworthy manufacturing certificates, and faithful PCC attestation.

Knowing when a photograph was captured is often a critical element in establishing its veracity. While prior industry systems have included a timestamp provided by the general device operating system, we believe this plainly falls short of the real-world assurance need. Instead, Apple Reference Image provides both a lower bound and an upper bound on capture time from Apple’s cryptographic timestamp service, and we guarantee the photo was taken between the two bounds. On a regular heartbeat, the device requests a cryptographic timestamp token, and retains the most recent one it has received. Globally this happens on average every 15 minutes, though the interval depends on local network conditions. This provides a proven lower bound timestamp for the photographic capture. After capture, the device requests a second timestamp to use as an upper bound, and both timestamps are embedded and signed with the sensor data.

> [!NOTE]
> **Annotation | Interval proof, not an exact trusted clock reading**
>
> If a pre-capture token has trusted time \(t_L\), the sensor-bound capture must occur after it; if a post-capture commitment receives trusted time \(t_U\), the capture material existed before it. The claim is therefore \(t_L \le t_{capture} \le t_U\). RFC 3161 defines the signed time-stamp-token mechanism, but the width and operational reliability of this interval depend on connectivity and service behavior. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161)

As a result, the secure digital negative contains all the essential information for rendering a reference image — the pixel data, essential sensor metadata, and the secure timestamp bounds — all protected from device software compromise. 

To develop this secure digital negative into a user-visible reference image, we take advantage of the privacy-preserving computing environment provided by Private Cloud Compute. When the user chooses to create a reference image, the device uploads the digital negative to PCC, which runs the processing steps needed to render the image — including demosaicing, tone mapping, and compression — in a highly secure, private, and verifiable environment. Experts can verify that PCC doesn’t alter a digital negative during development: they can examine the software that does the work. Every production build of PCC is recorded in an append-only, cryptographically tamper-proof transparency log, the binaries are available for public inspection, and a device will only send data to a node that can attest to running a build from that log. These are the same extraordinary guarantees we make for how PCC protects the privacy of Apple Intelligence requests, which are described in depth in [previous](https://security.apple.com/blog/private-cloud-compute/) [posts](https://security.apple.com/blog/expanding-pcc/).

> [!NOTE]
> **Annotation | Public verifiability has layers**
>
> PCC’s model combines code transparency, append-only logging, remote attestation, hardened nodes, and client policy. Publicly inspectable binaries let researchers compare a logged build with published code and study its behavior; attestation lets a device restrict uploads to an approved measurement. Neither property alone proves absence of implementation bugs, side channels, supply-chain faults, or differences in undisclosed components. Apple’s PCC post documents the intended architecture and threat model. [Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/)

Apple Reference Image combines the strong guarantees of these two stages — the hardware-level assurance over the secure digital negative, and PCC’s verifiable transparency over the processing algorithms — to provide industry-leading semantic authenticity for the resulting images.

### Resilience to Compromise

In designing Apple Reference Image, we considered a broad range of attacks, and constructed the system so as to resist compromise from multiple vectors. 

As described above, we designed the core reference image pipeline to withstand a compromise of the operating system, or a data injection attack on the sensor bus. But we needed additional safeguards against a broader class of hardware attacks that could involve removing the sensor from the device.

These defenses begin before a single picture is taken, at manufacturing time. When the image sensor is first initialized in the factory, it creates a cryptographic signing identity, sharing only the public key with the factory. The SEP similarly creates a separately-attested signing identity. These identities are bound together into the device manifest, allowing us to later check whether a particular sensor and SEP are from the same device. At capture time, the device incorporates this platform information into the digital negative it produces. When the reference image is then developed in PCC, PCC can validate that the photograph has come from a valid sensor-device pairing. 

> [!NOTE]
> **Annotation | Anti-transplant binding**
>
> Separate sensor and SEP identities, joined by a factory-signed manifest, prevent a valid sensor from being freely transplanted into an attacker-controlled platform without breaking the certified pairing. This shifts substantial trust into enrollment: factory CAs, manifest issuance, device identity records, and key-generation quality are part of the root of trust.

We also considered cryptographic attacks. Existing photo signing schemes, to our knowledge, all sign with classically secure algorithms, but quantum-secure algorithms are increasingly critical to the long-term integrity of cryptographic signatures. Because reference images are published assets whose integrity must survive for as long as anyone might want to check them, a signature secure only against classical adversaries isn't sufficient: an image asserted to be authentic in 2026 should be securely verifiable in perpetuity. So we designed the system to resist quantum attacks on any algorithm used to protect the integrity of publicly distributed reference images. The final signature on a reference image is a composite post-quantum signature combining RSA-3072 and ML-DSA-87. To our knowledge, Apple Reference Image is the only image provenance system that provides quantum-secure defenses. 
 
> [!NOTE]
> **Annotation | What the hybrid signature does—and does not—protect**
>
> ML-DSA is NIST’s standardized module-lattice signature scheme; ML-DSA-87 is its highest listed security parameter set. A well-defined composite verification policy can preserve authenticity if at least one constituent remains secure, but that property depends on the exact combiner and verifier semantics. Post-quantum protection of the final JPEG signature does not retroactively make every upstream certificate, timestamp, enrollment record, or operational service post-quantum secure. [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final)

Finally, as no security system is perfect, we created a revocation system that can revoke individual photos, as well as all photos from a specific sensor. As part of developing the secure digital negative, PCC computes a confidence score that assesses whether the image has the physical characteristics expected of raw output from our camera sensors. Before the developed reference image is signed, PCC sends the photo GUID, sensor ID, and this confidence score to a companion service, which records them and updates the running score associated with that sensor. If a low-scoring sensor is revoked, PCC will no longer sign its images. Apple devices fetch updated revocation lists on a regular cadence; any time a reference image is viewed, the viewer can have confidence that the image isn’t known to be fraudulent. 

> [!NOTE]
> **Annotation | Detection and revocation are the least transparent layer**
>
> The hidden-weight neural score is defense in depth, not a publicly reproducible proof. Its false-positive and false-negative rates, calibration, robustness to adaptive sensor emulation, aggregation rule, and revocation threshold are not disclosed here. Revocation also changes verification from a timeless signature check into a freshness-sensitive status check: an offline or stale client can only know what its last list knew. The positive statement supported by the mechanism is “not currently known to be revoked,” not “never fraudulent.”

### Privacy Preservation

Other industry solutions require a photographer or institution to vouch for an image using their own credentials. We are concerned this puts some photographers, such as those operating in conflict zones, in a difficult position; it should not be necessary to forgo anonymity in order to prove image authenticity. We built Apple Reference Image to avoid using an explicit, public credential for photographers, and to avoid even implicit public association between different photos taken by the same sensor. The final reference image is instead signed by Apple’s signing service, after validation by PCC. That signature is backed by Apple’s strongest technical guarantees. 

> [!NOTE]
> **Annotation | Public unlinkability versus operator-side linkability**
>
> A common Apple signer prevents public signatures from acting as stable per-camera pseudonyms. It does not make the backend unlinkable: the article later states that a private service stores photo GUID–sensor associations for revocation. The privacy claim is therefore chiefly that public observers and ordinary verification clients cannot correlate by sensor identity, while Apple’s segregated service retains a deliberately limited correlation capability.

Our implementation also protects the confidentiality of the image itself, including from Apple. Merely capturing a reference image should never expose the actual pixels to Apple or anyone else. We achieve this through the exceptional privacy properties of PCC — the nodes themselves are architected so that not even Apple can access image data, just as Apple cannot see the information processed for Apple Intelligence in PCC. While the revocation service must maintain a private record of photo GUIDs and associated sensors to allow for revocation, it never has access to the image data, and does not allow for public access to this record. And as final revocation checks occur using on-device lists, a device never reveals to anyone which photo it's looking at in order to find out whether it's still valid.

Last, we have taken care to limit network visibility wherever possible. Timestamping requests travel over [Oblivious HTTP](https://www.rfc-editor.org/rfc/rfc9458), so the timestamp service never learns the IP address of the requesting device. Similarly, calls to the revocation and signing services occur from within PCC itself, which provides only the minimum information required for those services to function. Altogether, we believe these privacy protections are far stronger than in any existing image provenance system, allowing both photographers and viewers access to authentic images without inadvertently revealing their personal information.

> [!NOTE]
> **Annotation | Metadata separation is architectural, not absolute anonymity**
>
> Oblivious HTTP separates the client-facing relay from the target-facing gateway so the target does not simultaneously learn the client IP and plaintext request, assuming those roles do not collude and traffic-analysis leakage is controlled. PCC likewise compartmentalizes pixels from the revocation database. These measures reduce linkability at specific interfaces; they do not erase all device, account, timing, network, or publication metadata outside the defined protocol. [RFC 9458](https://www.rfc-editor.org/rfc/rfc9458)

Across all three requirements — semantic authenticity, resilience to compromise, and privacy preservation — we believe that Apple Reference Image sets a new standard for security in the industry. For readers who are additionally interested in the technical details of our implementation, the next section will describe the precise manufacturing, signing, and verification sequences that underpin the security guarantees of Apple Reference Image.




### Technical Details

##### Reference Image Set-Up

The foundation for Apple Reference Image is created during device manufacturing. When an Apple photo sensor is first initialized, it generates its own ECDSA P-256 signing key pair and never releases the private half. The factory recording station retrieves only the corresponding public verification key, signs it with a factory certificate authority (CA), and records the key and certificate in the device's hardware manifest. 

The Secure Enclave Processor (SEP) goes through a similar process: it generates a key certified by our Basic Attestation Authority (BAA) under a separate CA, which lets the device later produce signatures that Apple can attribute to that specific phone. A third CA then signs the device manifest itself, binding the sensor key and the BAA-attested SEP key together as belonging to the same iPhone. This binding is what later lets us state that a particular sensor and a particular Secure Enclave were, and are, part of the same device.

Once the device is in use, it begins timestamp collection. Apple Push Notification Service (APNs) runs an existing heartbeat protocol to ensure the health of the connection for push notifications. Coinciding with this heartbeat, APNs now delivers an up-to-date RFC 3161 timestamp token from Apple's timestamp service, signed with ECDSA P-256 over SHA-256, and the device keeps the most recent one it receives.

> [!NOTE]
> **Annotation | Classical roots remain upstream**
>
> The setup uses ECDSA P-256 for sensor identity and timestamps, even though the final published-image signature is hybrid post-quantum. Long-term verification must therefore specify what evidence is preserved, how old classical attestations are evaluated after possible cryptanalytic advances, and whether the PCC-issued final signature is intended to encapsulate those validations at development time.


##### Image Capture

To begin the capture process, the user switches to Reference mode. This reboots the sensor into the specialized, secure reference mode. This capture mode accepts one input from the device operating system: a SHA-256 digest to be embedded at a fixed location in the captured frame’s metadata. The digest is computed from the most recent secure timestamp, the device manifest, and the device's secure boot manifest.

At capture, the sensor measures light as an analog signal, which is digitized. The digitized frame and the embedded metadata digest are signed together, inside the sensor, with the sensor's private key. OS-derived metadata (digital zoom factor, exposure, and lens parameters) is collected from the camera system. We take a commitment to the sensor's signature together with this metadata and sign it with the SEP, using the BAA-attested key.

We compute a SHA-256 commitment to the SEP signature and send it to the timestamp service, which returns a signed token establishing that the photo existed no later than that moment, an upper bound to complement the lower bound already embedded in the frame. If the device is offline, no upper bound is available yet; a background process keeps attempting the request and inserts the token once it succeeds, producing the tightest interval the circumstances allow.

Everything produced so far — the pixels, both signatures, the timestamps, the metadata, the device manifest, and the secure boot manifest — is stored in the secure digital negative on the device, in DNG format, linked to the conventionally processed photo from the standard pipeline. The negative can sit there indefinitely, and it can also be shared in this undeveloped state, a workflow professional photographers may need.

> [!NOTE]
> **Annotation | Signed dependency graph**
>
> The sensor signature binds pixels to a digest of the earlier timestamp and platform manifests. The SEP signature commits to that sensor signature plus OS-origin metadata. The later timestamp commits to the SEP signature. This nesting is what makes substitution detectable: changing a downstream field breaks its signature, while changing an upstream object breaks the digest or commitment carried by the next layer.


##### Reference Image Development

When the user initiates developing a reference image, the device uploads the secure digital negative to Private Cloud Compute. PCC recomputes the digest embedded in the frame and verifies the sensor's signature over the pixels and that digest, verifying the certificate chain back to the sensor CA. PCC also verifies the SEP signature and chains it to the BAA CA, and it verifies the signature on the device manifest and chains it to the CA that signs device manifests at the factory. It then confirms that the sensor and SEP named in those chains belong to the same device. Only if all these checks pass does processing continue.

PCC next checks the timestamps. If the lower-bound timestamp fails verification, PCC substitutes March 31, 2026, since the feature didn't exist before that date and no photo can predate it. If the upper-bound timestamp is missing or doesn't verify, PCC substitutes the current development time in PCC. 

> [!NOTE]
> **Annotation | Conservative fallback, weaker precision**
>
> Substitution avoids treating a missing token as a hard failure, but changes the evidentiary meaning. The fallback lower bound is a product-era bound, not proof tied to that capture; the fallback upper bound proves no more than that development occurred by PCC’s current time. A verifier should expose whether original or fallback bounds were used rather than presenting all intervals as equally strong.

Using a neural network with hidden weights, PCC computes a confidence score for the photograph. This additional step confirms that the image has the physical characteristics expected of raw output from our sensors, increasing confidence in its authenticity. PCC then develops the negative with demosaicing, tone mapping, and related corrections. The result is compressed as a JPEG and hashed, creating a commitment to the developed image. This hash serves two purposes: it's the value that will be signed, assuming it passes our remaining checks, and it supplies the bits used for the photo GUID.

PCC sends the photo GUID, the raw hash, the confidence score, and the sensor ID to a companion service, which records them, updates the running confidence score associated with that sensor, and confirms the sensor doesn't appear on a revocation list. If these checks pass, PCC then submits the commitment to our signing service, which signs it with a composite post-quantum signature using a hybrid MLDSA87-RSA-3072-PSS-SHA512 scheme. The signature is embedded in the JPEG, and the reference image is returned to the device, which associates it with the main photo from the original capture.

After the secure digital negative is successfully developed, it's automatically moved to the deleted photos folder. As with any deleted photo, the user can recover the negative for preservation if desired, or delete it immediately; otherwise it's automatically purged after 30 days.

On the client side, whenever the reference image is displayed, the client verifies the final signature on the JPEG and confirms its photo GUID doesn't appear on the current revocation list before showing the image. 

> [!NOTE]
> **Annotation | Verification collapses a complex ceremony into one credential**
>
> The viewer checks Apple’s final signature and a revocation list, not the sensor and SEP chain directly. Apple’s signing service therefore attests that PCC performed the upstream verification and approved a particular JPEG hash. This produces a simple client experience, but also centralizes issuance policy and makes independent long-term audit depend on publication of verifier formats, certificate policy, transparency evidence, archived revocation state, and the exact hybrid-signature construction.


### Conclusion

Apple Reference Image builds on Apple's unique foundation of capabilities in hardware and software, including sensor identity certification at the factory, silicon security, and Private Cloud Compute, giving photographers a new way to provide a verifiable photograph. This allows them to attest to what their iPhone actually captured, without requiring them to expose a public identity or place trust in a third party. At its core, Apple Reference Image binds a signature from an iPhone camera sensor to a securely timestamped, tamper-evident record, developing it inside PCC while running publicly verifiable code, and signing it with a composite post-quantum signature designed to remain secure for decades. If a device is later found to be compromised, its images can be revoked and flagged retroactively, without revealing which images came from the same sensor. The result is a verification model that offers photographers, newsrooms, and everyday users renewed confidence that an image they’re viewing is a photograph actually captured by a camera.

> [!NOTE]
> **Takeaways | What is genuinely new, and what remains open**
>
> The strongest idea is an end-to-end capture ceremony: sensor-origin signing, device-component binding, interval timestamps, attestable cloud development, privacy-segregated revocation, and a hybrid final signature. It meaningfully narrows the space for software-only forgery while avoiding a public per-camera identity. The important open questions are interoperability; independent verifier and test-vector availability; the exact composite-signature semantics; transparency-log auditability; confidence-model error rates; fallback-time disclosure; revocation freshness and archival behavior; and how downstream edits or C2PA manifests compose with the Apple-issued reference image.
