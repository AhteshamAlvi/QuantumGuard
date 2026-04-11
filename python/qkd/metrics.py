def compute_qber(errors, total):
    return errors / total if total > 0 else 0
