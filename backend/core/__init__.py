import smtplib
import sys

# Monkey patch for Python 3.12+ compatibility with older Django versions
# Python 3.12 removed 'keyfile' and 'certfile' parameters from SMTP.starttls()
# Django versions < 4.2.4 (and < 3.2.20) still pass these parameters, 
# which causes an "unexpected keyword argument" TypeError in Python 3.12.
if sys.version_info >= (3, 12):
    _original_starttls = smtplib.SMTP.starttls

    def patched_starttls(self, keyfile=None, certfile=None, context=None):
        """
        Custom starttls that ignores keyfile and certfile for Python 3.12+
        """
        return _original_starttls(self, context=context)

    smtplib.SMTP.starttls = patched_starttls
